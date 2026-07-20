import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from 'lib/supabase';

const SYNC_DEBOUNCE_MS = 600;

function ratingForDb(rating) {
  return rating && rating > 0 ? rating : null;
}

function entryChanged(next, prev) {
  if (!next) return false;
  if (!prev) return true;
  return (
    (next.status ?? 'unread') !== (prev.status ?? 'unread') ||
    (next.isRead ?? false) !== (prev.isRead ?? false) ||
    (next.rating ?? 0) !== (prev.rating ?? 0) ||
    (next.notes ?? '') !== (prev.notes ?? '') ||
    (next.personalTake ?? '') !== (prev.personalTake ?? '')
  );
}

function normalizeEntry(e) {
  if (!e) return null;
  return {
    status: e.status,
    isRead: e.isRead,
    rating: e.rating,
    notes: e.notes,
    personalTake: e.personalTake,
    startedAt: e.startedAt,
  };
}

export function useSupabaseProgress() {
  const [bookProgress, setBookProgressState] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const entryIdToIdRef = useRef(new Map());
  const idToEntryIdRef = useRef(new Map());
  const idToParentIdRef = useRef(new Map());
  const completedAtByIdRef = useRef(new Map());
  const startedAtByIdRef = useRef(new Map());
  const lastSyncedRef = useRef({});
  const pendingRef = useRef(null);
  const userIdRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const flushingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Not authenticated');
        if (cancelled) return;
        userIdRef.current = user.id;

        const { data: books, error: booksError } = await supabase
          .from('books')
          .select('id, title, parent_book_id, entry_id');
        if (booksError) throw booksError;

        const entryIdToId = new Map();
        const idToEntryId = new Map();
        const idToParentId = new Map();
        for (const b of books || []) {
          entryIdToId.set(b.entry_id, b.id);
          idToEntryId.set(b.id, b.entry_id);
          idToParentId.set(b.id, b.parent_book_id);
        }
        entryIdToIdRef.current = entryIdToId;
        idToEntryIdRef.current = idToEntryId;
        idToParentIdRef.current = idToParentId;

        const { data: progressRows, error: progressError } = await supabase
          .from('user_progress')
          .select('book_id, status, is_read, rating, notes, personal_take, started_at, completed_at, chronicle, auspex_reading, context_drop_raw, context_drop_at, context_drop_model, context_drop_schema_version, music_scenes, open_questions');
        if (progressError) throw progressError;

        const next = {};
        const completedAtById = new Map();
        const startedAtById = new Map();
        for (const row of progressRows || []) {
          completedAtById.set(row.book_id, row.completed_at || null);
          startedAtById.set(row.book_id, row.started_at || null);
          const entryId = idToEntryId.get(row.book_id);
          if (!entryId) {
            console.warn('[useSupabaseProgress] orphan progress row, unknown book_id:', row.book_id);
            continue;
          }
          const parentId = idToParentId.get(row.book_id);
          const entry = {
            status: row.status ?? (row.is_read ? 'read' : 'unread'),
            isRead: row.is_read ?? false,
            rating: row.rating ?? 0,
            notes: row.notes ?? '',
            personalTake: row.personal_take ?? '',
            startedAt: row.started_at ?? null,
            completedAt: row.completed_at ?? null,
            chronicle: row.chronicle ?? null,
            auspexReading: row.auspex_reading ?? null,
            contextDropRaw: row.context_drop_raw ?? '',
            contextDropAt: row.context_drop_at ?? null,
            musicScenes: row.music_scenes ?? null,
            openQuestions: row.open_questions ?? null,
          };
          if (parentId == null) {
            const existing = next[entryId] || {};
            next[entryId] = { ...existing, ...entry };
          } else {
            const parentEntryId = idToEntryId.get(parentId);
            if (!parentEntryId) {
              console.warn('[useSupabaseProgress] sub-item parent_book_id not found:', parentId);
              continue;
            }
            // Sub-items store flat under their own entry_id, full ternary shape.
            next[entryId] = { ...(next[entryId] || {}), ...entry };
          }
        }
        completedAtByIdRef.current = completedAtById;
        startedAtByIdRef.current = startedAtById;
        if (cancelled) return;
        lastSyncedRef.current = JSON.parse(JSON.stringify(next));
        setBookProgressState(next);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error('[useSupabaseProgress] load failed:', e);
        setError(e.message || String(e));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    const next = pendingRef.current;
    if (!next) return;
    const userId = userIdRef.current;
    if (!userId) return;

    flushingRef.current = true;
    try {
      const entryIdToId = entryIdToIdRef.current;
      const completedAtById = completedAtByIdRef.current;
      const startedAtById = startedAtByIdRef.current;
      const lastSynced = lastSyncedRef.current;

      const payloads = [];
      const seen = new Set();
      const topEntryIds = new Set([...Object.keys(next), ...Object.keys(lastSynced)]);

      const isPureContainer = (e) =>
        e && e.isRead === undefined && e.rating === undefined && e.notes === undefined;

      const buildPayload = (entryId, nextEntry, prevEntry) => {
        // Toggling a sub-item creates a parent `{ contents: {...} }` with no
        // progress fields of its own. Don't write a phantom default parent row.
        if (isPureContainer(nextEntry) && (prevEntry === undefined || isPureContainer(prevEntry))) {
          return;
        }
        const nextNorm = normalizeEntry(nextEntry);
        const prevNorm = normalizeEntry(prevEntry);
        if (!entryChanged(nextNorm, prevNorm)) return;
        const bookId = entryIdToId.get(entryId);
        if (!bookId) {
          console.warn('[useSupabaseProgress] unknown entry_id on write:', entryId);
          return;
        }
        if (seen.has(bookId)) return;
        const status = nextNorm?.status ?? (nextNorm?.isRead ? 'read' : 'unread');

        // started_at: einmal gesetzt bei erstem reading/read, danach erhalten.
        // completed_at: nur bei 'read' gesetzt, sonst null.
        const prevStartedAt = startedAtById.get(bookId) || null;
        const startedAt =
          status === 'unread'
            ? null
            : (prevStartedAt || new Date().toISOString());
        const completedAt =
          status === 'read'
            ? (completedAtById.get(bookId) || new Date().toISOString())
            : null;

        payloads.push({
          user_id: userId,
          book_id: bookId,
          status,
          rating: ratingForDb(nextNorm?.rating),
          notes: nextNorm?.notes ?? null,
          personal_take: nextNorm?.personalTake ?? null,
          started_at: startedAt,
          completed_at: completedAt,
        });
        seen.add(bookId);
      };

      for (const entryId of topEntryIds) {
        const nextEntry = next[entryId];
        const prevEntry = lastSynced[entryId];
        buildPayload(entryId, nextEntry, prevEntry);

        const nextContents = nextEntry?.contents || {};
        const prevContents = prevEntry?.contents || {};
        const subEntryIds = new Set([...Object.keys(nextContents), ...Object.keys(prevContents)]);
        for (const subEntryId of subEntryIds) {
          buildPayload(subEntryId, nextContents[subEntryId], prevContents[subEntryId]);
        }
      }

      if (payloads.length === 0) {
        if (pendingRef.current === next) pendingRef.current = null;
        return;
      }

      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert(payloads, { onConflict: 'user_id,book_id' });

      if (upsertError) {
        console.error('[useSupabaseProgress] upsert failed:', upsertError);
        setError(upsertError.message || String(upsertError));
        return;
      }

      for (const p of payloads) {
        completedAtById.set(p.book_id, p.completed_at);
        startedAtById.set(p.book_id, p.started_at);
      }
      lastSyncedRef.current = JSON.parse(JSON.stringify(next));
      setError(null);
      if (pendingRef.current === next) {
        pendingRef.current = null;
      } else {
        scheduleSyncRef.current?.();
      }
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const scheduleSyncRef = useRef(null);
  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null;
      flush();
    }, SYNC_DEBOUNCE_MS);
  }, [flush]);
  scheduleSyncRef.current = scheduleSync;

  // Context Drop writes six columns in one direct upsert (no debounce): it is a
  // deliberate one-shot commit, not continuous typing. Uses the same supabase
  // client + user session as the debounced path, so same RLS auth. After the
  // write it patches local state AND lastSyncedRef, so the debounce flush does
  // not later see these fields as a diff and clobber them.
  const handleContextDropSave = useCallback(async (entryId, result) => {
    const userId = userIdRef.current;
    if (!userId) throw new Error('Not authenticated');
    const bookId = entryIdToIdRef.current.get(entryId);
    if (!bookId) throw new Error('Unknown entry_id: ' + entryId);

    const nowIso = new Date().toISOString();
    const row = {
      user_id: userId,
      book_id: bookId,
      chronicle: result.chronicle ?? null,
      auspex_reading: result.auspex_reading ?? null,
      music_scenes: result.music_scenes ?? null,
      open_questions: result.open_questions ?? null,
      context_drop_raw: result.raw ?? null,
      context_drop_at: nowIso,
      context_drop_model: result.meta?.model ?? null,
      context_drop_schema_version: result.meta?.schema_version ?? null,
    };

    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert(row, { onConflict: 'user_id,book_id' });
    if (upsertError) throw upsertError;

    setBookProgressState((prev) => {
      const nextEntry = {
        ...(prev[entryId] || {}),
        chronicle: row.chronicle,
        auspexReading: row.auspex_reading,
        musicScenes: row.music_scenes,
        openQuestions: row.open_questions,
        contextDropRaw: row.context_drop_raw ?? '',
        contextDropAt: nowIso,
      };
      const next = { ...prev, [entryId]: nextEntry };
      // Keep lastSynced in lockstep so the debounce flush sees no diff here.
      if (lastSyncedRef.current[entryId]) {
        lastSyncedRef.current[entryId] = {
          ...lastSyncedRef.current[entryId],
          chronicle: row.chronicle,
          auspexReading: row.auspex_reading,
          musicScenes: row.music_scenes,
          openQuestions: row.open_questions,
          contextDropRaw: row.context_drop_raw ?? '',
          contextDropAt: nowIso,
        };
      }
      return next;
    });
  }, []);

  const setBookProgress = useCallback((updater) => {
    setBookProgressState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pendingRef.current = next;
      scheduleSync();
      return next;
    });
  }, [scheduleSync]);

  useEffect(() => () => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
  }, []);

  return [bookProgress, setBookProgress, { loading, error }, handleContextDropSave];
}

export default useSupabaseProgress;

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
    (next.isRead ?? false) !== (prev.isRead ?? false) ||
    (next.rating ?? 0) !== (prev.rating ?? 0) ||
    (next.notes ?? '') !== (prev.notes ?? '')
  );
}

function normalizeEntry(e) {
  if (!e) return null;
  return { isRead: e.isRead, rating: e.rating, notes: e.notes };
}

export function useSupabaseProgress() {
  const [bookProgress, setBookProgressState] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const titleToIdRef = useRef(new Map());
  const idToTitleRef = useRef(new Map());
  const idToParentIdRef = useRef(new Map());
  const completedAtByIdRef = useRef(new Map());
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
          .select('id, title, parent_book_id');
        if (booksError) throw booksError;

        const titleToId = new Map();
        const idToTitle = new Map();
        const idToParentId = new Map();
        for (const b of books || []) {
          titleToId.set(b.title, b.id);
          idToTitle.set(b.id, b.title);
          idToParentId.set(b.id, b.parent_book_id);
        }
        titleToIdRef.current = titleToId;
        idToTitleRef.current = idToTitle;
        idToParentIdRef.current = idToParentId;

        const { data: progressRows, error: progressError } = await supabase
          .from('user_progress')
          .select('book_id, is_read, rating, notes, completed_at');
        if (progressError) throw progressError;

        const next = {};
        const completedAtById = new Map();
        for (const row of progressRows || []) {
          completedAtById.set(row.book_id, row.completed_at || null);
          const title = idToTitle.get(row.book_id);
          if (!title) {
            console.warn('[useSupabaseProgress] orphan progress row, unknown book_id:', row.book_id);
            continue;
          }
          const entry = {
            isRead: row.is_read ?? false,
            rating: row.rating ?? 0,
            notes: row.notes ?? '',
          };
          const parentId = idToParentId.get(row.book_id);
          if (parentId == null) {
            const existing = next[title] || {};
            next[title] = { ...existing, ...entry, contents: existing.contents || {} };
          } else {
            const parentTitle = idToTitle.get(parentId);
            if (!parentTitle) {
              console.warn('[useSupabaseProgress] sub-item parent_book_id not found:', parentId);
              continue;
            }
            const parent = next[parentTitle] || { contents: {} };
            parent.contents = { ...(parent.contents || {}), [title]: entry };
            next[parentTitle] = parent;
          }
        }
        completedAtByIdRef.current = completedAtById;
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
      const titleToId = titleToIdRef.current;
      const completedAtById = completedAtByIdRef.current;
      const lastSynced = lastSyncedRef.current;

      const payloads = [];
      const seen = new Set();
      const topTitles = new Set([...Object.keys(next), ...Object.keys(lastSynced)]);

      const isPureContainer = (e) =>
        e && e.isRead === undefined && e.rating === undefined && e.notes === undefined;

      const buildPayload = (title, nextEntry, prevEntry) => {
        // Toggling a sub-item creates a parent `{ contents: {...} }` with no
        // progress fields of its own. Don't write a phantom default parent row.
        if (isPureContainer(nextEntry) && (prevEntry === undefined || isPureContainer(prevEntry))) {
          return;
        }
        const nextNorm = normalizeEntry(nextEntry);
        const prevNorm = normalizeEntry(prevEntry);
        if (!entryChanged(nextNorm, prevNorm)) return;
        const bookId = titleToId.get(title);
        if (!bookId) {
          console.warn('[useSupabaseProgress] unknown title on write:', title);
          return;
        }
        if (seen.has(bookId)) return;
        const isRead = nextNorm?.isRead ?? false;
        const completedAt = isRead
          ? (completedAtById.get(bookId) || new Date().toISOString())
          : null;
        payloads.push({
          user_id: userId,
          book_id: bookId,
          status: isRead ? 'read' : 'unread',
          rating: ratingForDb(nextNorm?.rating),
          notes: nextNorm?.notes ?? null,
          completed_at: completedAt,
        });
        seen.add(bookId);
      };

      for (const title of topTitles) {
        const nextEntry = next[title];
        const prevEntry = lastSynced[title];
        buildPayload(title, nextEntry, prevEntry);

        const nextContents = nextEntry?.contents || {};
        const prevContents = prevEntry?.contents || {};
        const subTitles = new Set([...Object.keys(nextContents), ...Object.keys(prevContents)]);
        for (const subTitle of subTitles) {
          buildPayload(subTitle, nextContents[subTitle], prevContents[subTitle]);
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

      for (const p of payloads) completedAtById.set(p.book_id, p.completed_at);
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

  return [bookProgress, setBookProgress, { loading, error }];
}

export default useSupabaseProgress;

import { useState, useEffect } from 'react';
import { supabase } from 'lib/supabase';

const PROJECT_TITLE = 'The Infinity Archive';
const PROJECT_DESCRIPTION =
  'A curated Warhammer 40k reading journey covering the decline and transformation of the Imperium.';

// Reassembles the read-catalog (phases + books) from Supabase into the
// `projectData` shape App.js renders from.
//
// Shape produced:
//   { projectTitle, description, totalPhases,
//     phases: [ { id, title, subtitle, theme, color,
//       books: [ { entryId, title, author, pages, type, tags, contents? } ] } ] }
// where contents (only present when an entry has children) is:
//       [ { entryId, title, pages, type } ]
// entryId is the stable DB join-key (B-3c); App.js uses it as the per-book
// state key (E-2b). description is a static display constant (not DB data);
// totalPhases is derived from the phase count.
//
// The hook is defined here; App.js consumes it for the catalog render.

export function useCatalog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [{ data: phases, error: phasesError }, { data: books, error: booksError }] =
          await Promise.all([
            supabase
              .from('phases')
              .select('id, title, subtitle, theme, color, sort_order')
              .order('sort_order', { ascending: true }),
            supabase
              .from('books')
              .select('id, phase_id, parent_book_id, title, author, pages, type, tags, sort_order, row_type, entry_id')
              .order('sort_order', { ascending: true }),
          ]);

        if (phasesError) throw phasesError;
        if (booksError) throw booksError;
        if (cancelled) return;

        const phaseRows = phases || [];
        const bookRows = books || [];

        // Index children by their parent entry id. bookRows are already sorted
        // by sort_order ASC, so each children array stays in sort_order order.
        const childrenByParentId = new Map();
        for (const b of bookRows) {
          if (b.parent_book_id == null) continue;
          if (!childrenByParentId.has(b.parent_book_id)) {
            childrenByParentId.set(b.parent_book_id, []);
          }
          childrenByParentId.get(b.parent_book_id).push(b);
        }

        // Group entry rows (parent_book_id IS NULL) by phase, preserving the
        // global sort_order ordering.
        const entriesByPhaseId = new Map();
        for (const b of bookRows) {
          if (b.parent_book_id != null) continue;
          if (!entriesByPhaseId.has(b.phase_id)) entriesByPhaseId.set(b.phase_id, []);
          entriesByPhaseId.get(b.phase_id).push(b);
        }

        const phasesOut = phaseRows.map((phase) => {
          const entries = entriesByPhaseId.get(phase.id) || [];
          const booksOut = entries.map((entry) => {
            const book = {
              entryId: entry.entry_id,
              title: entry.title,
              author: entry.author,
              pages: entry.pages ?? 0,
              type: entry.type,
              tags: Array.isArray(entry.tags) ? entry.tags : [],
            };
            const children = childrenByParentId.get(entry.id) || [];
            if (children.length > 0) {
              book.contents = children.map((sub) => ({
                entryId: sub.entry_id,
                title: sub.title,
                pages: sub.pages ?? 0,
                type: sub.type,
              }));
            }
            return book;
          });

          return {
            id: phase.id,
            title: phase.title,
            subtitle: phase.subtitle,
            theme: phase.theme,
            color: phase.color,
            books: booksOut,
          };
        });

        setData({
          projectTitle: PROJECT_TITLE,
          description: PROJECT_DESCRIPTION,
          totalPhases: phasesOut.length,
          phases: phasesOut,
        });
      } catch (e) {
        if (cancelled) return;
        console.error('[useCatalog] load failed:', e);
        setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export default useCatalog;

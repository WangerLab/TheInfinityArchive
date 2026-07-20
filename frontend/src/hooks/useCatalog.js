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
//       books: [ { entryId, title, author, pages, type, tags,
//                  locationPrimary, locationSegmentum, inUniverseDate,
//                  protagonist, keyCharacters, subFaction, factionPrimary,
//                  grandAlliance, factionSigil,
//                  moodTags, semanticTags, summary,
//                  series: { name, orderLabel, sortPosition } | null,
//                  contents? } ] } ] }
// where contents (only present when an entry has children) is:
//       [ { entryId, title, pages, type,
//           locationPrimary, locationSegmentum, inUniverseDate,
//           protagonist, keyCharacters, subFaction, grandAlliance, factionSigil,
//           moodTags, summary,
//           series: { name, orderLabel, sortPosition } | null } ]
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
        const [
          { data: phases, error: phasesError },
          { data: books, error: booksError },
          { data: bookSeriesRows, error: bookSeriesError },
        ] = await Promise.all([
            supabase
              .from('phases')
              .select('id, title, subtitle, theme, color, sort_order')
              .order('sort_order', { ascending: true }),
            supabase
              .from('books')
              .select('id, phase_id, parent_book_id, title, author, pages, type, tags, sort_order, row_type, entry_id, location_primary, location_segmentum, in_universe_date, protagonist, key_characters, sub_faction, faction_primary, parent_faction, mood_tags, semantic_tags, spoiler_free_summary, grand_alliance, faction_sigil, duplicate_of')
              .order('sort_order', { ascending: true }),
            supabase
              .from('book_series')
              .select('book_id, order_label, sort_position, series:series_id ( name )'),
          ]);

        if (phasesError) throw phasesError;
        if (booksError) throw booksError;
        if (bookSeriesError) throw bookSeriesError;
        if (cancelled) return;

        const phaseRows = phases || [];
        const bookRows = books || [];

        // Build series lookup keyed by book UUID. When a book belongs to multiple
        // series, pick the one with the lowest sort_position (NULL = Infinity, loses).
        const sortedSeries = [...(bookSeriesRows || [])].sort((a, b) => {
          const ap = a.sort_position ?? Infinity;
          const bp = b.sort_position ?? Infinity;
          return ap - bp;
        });
        const seriesByBookId = new Map();
        for (const row of sortedSeries) {
          if (!seriesByBookId.has(row.book_id)) {
            seriesByBookId.set(row.book_id, {
              name: row.series?.name ?? null,
              orderLabel: row.order_label ?? null,
              sortPosition: row.sort_position ?? null,
            });
          }
        }

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
              locationPrimary: entry.location_primary ?? null,
              locationSegmentum: entry.location_segmentum ?? null,
              inUniverseDate: entry.in_universe_date ?? null,
              protagonist: entry.protagonist ?? null,
              keyCharacters: Array.isArray(entry.key_characters) ? entry.key_characters : [],
              subFaction: entry.sub_faction ?? null,
              factionPrimary: entry.faction_primary ?? null,
              parentFaction: entry.parent_faction ?? null,
              grandAlliance: entry.grand_alliance ?? null,
              factionSigil: entry.faction_sigil ?? null,
              duplicateOf: entry.duplicate_of ?? null,
              moodTags: Array.isArray(entry.mood_tags) ? entry.mood_tags : [],
              semanticTags: Array.isArray(entry.semantic_tags) ? entry.semantic_tags : [],
              summary: entry.spoiler_free_summary ?? null,
              series: seriesByBookId.get(entry.id) ?? null,
            };
            const children = childrenByParentId.get(entry.id) || [];
            if (children.length > 0) {
              book.contents = children.map((sub) => ({
                entryId: sub.entry_id,
                title: sub.title,
                pages: sub.pages ?? 0,
                type: sub.type,
                locationPrimary: sub.location_primary ?? null,
                locationSegmentum: sub.location_segmentum ?? null,
                inUniverseDate: sub.in_universe_date ?? null,
                protagonist: sub.protagonist ?? null,
                keyCharacters: Array.isArray(sub.key_characters) ? sub.key_characters : [],
                subFaction: sub.sub_faction ?? null,
                factionPrimary: sub.faction_primary ?? null,
                parentFaction: sub.parent_faction ?? null,
                grandAlliance: sub.grand_alliance ?? null,
                factionSigil: sub.faction_sigil ?? null,
                moodTags: Array.isArray(sub.mood_tags) ? sub.mood_tags : [],
                summary: sub.spoiler_free_summary ?? null,
                series: seriesByBookId.get(sub.id) ?? null,
              }));
            }

            // Omnibus parents carry no sub_faction of their own (enriched
            // metadata lives on the children), so faction_sigil is NULL. Derive
            // the parent's display sigil from its children: the most common
            // non-null child sigil, ties broken by reading order. Stays null if
            // no child has one (-> falls back to the alliance mark).
            if (book.contents && !book.factionSigil) {
              const counts = new Map();
              for (const c of book.contents) {
                if (!c.factionSigil) continue;
                counts.set(c.factionSigil, (counts.get(c.factionSigil) || 0) + 1);
              }
              let best = null, bestN = 0;
              for (const c of book.contents) {
                if (!c.factionSigil) continue;
                const n = counts.get(c.factionSigil);
                if (n > bestN) { bestN = n; best = c.factionSigil; }
              }
              book.factionSigil = best;
            }

            // Same for the display faction NAME: omnibus parents have no
            // sub_faction, so derive a primary faction label from the most
            // common non-empty child sub_faction (primary POV-bearer value,
            // parenthetical qualifier stripped), ties broken by reading order.
            // Attached as derivedFaction so BookRow can show it without
            // re-deriving. Plain entries keep their own sub_faction.
            if (book.contents && !book.subFaction) {
              const primaryOf = (sf) => {
                if (!sf) return null;
                let depth = 0, end = sf.length;
                for (let i = 0; i < sf.length; i++) {
                  const ch = sf[i];
                  if (ch === '(') depth++;
                  else if (ch === ')') depth = Math.max(0, depth - 1);
                  else if (ch === ';' && depth === 0) { end = i; break; }
                }
                return sf.slice(0, end).trim().replace(/\s*\([^)]*\)\s*$/, '').trim() || null;
              };
              const counts = new Map();
              for (const c of book.contents) {
                const f = primaryOf(c.subFaction);
                if (f) counts.set(f, (counts.get(f) || 0) + 1);
              }
              let best = null, bestN = 0;
              for (const c of book.contents) {
                const f = primaryOf(c.subFaction);
                if (!f) continue;
                const n = counts.get(f);
                if (n > bestN) { bestN = n; best = f; }
              }
              book.derivedFaction = best;
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

-- B-3b: extend books with BL-GRP metadata columns (TIA-Schema-v2.md §4)
-- Applied via Supabase connector (apply_migration) against project
-- zekmlnnhczfdllbmxjec on 2026-06-07. Recorded here for traceability.
--
-- All 22 columns are nullable and unpopulated; seeding follows in B-3c (CSV seed).
-- Defaults only on the boolean flags. No enums, no CHECK constraints per
-- Schema-Doc D3 (tag/segmentum/faction stay open text/text[] value-lists).
--
-- Deliberately NOT added (per Schema-Doc §5):
--   series / series_order -> own M:N series table in Sprint F
--   status                -> lives on user_progress (B-3a)
--   omnibus_contents      -> redundant with parent_book_id, dropped
--   entry_id              -> import join-key only (B-3c), not stored
--
-- The existing type CHECK, self-FK (parent_book_id) and phase-FK are untouched.

ALTER TABLE public.books
  ADD COLUMN pub_year              integer,
  ADD COLUMN page_count_confidence text,
  ADD COLUMN format                text,
  ADD COLUMN is_omnibus            boolean DEFAULT false,
  ADD COLUMN row_type              text,
  ADD COLUMN location_primary      text,
  ADD COLUMN location_segmentum    text,
  ADD COLUMN in_universe_date      text,
  ADD COLUMN protagonist           text,
  ADD COLUMN key_characters        text[],
  ADD COLUMN sub_faction           text,
  ADD COLUMN faction_primary       text,
  ADD COLUMN faction_secondary     text[],
  ADD COLUMN sub_genre             text,
  ADD COLUMN mood_tags             text[],
  ADD COLUMN semantic_tags         text[],
  ADD COLUMN spoiler_free_summary  text,
  ADD COLUMN track                 text,
  ADD COLUMN reading_order_note    text,
  ADD COLUMN also_in               text,
  ADD COLUMN acquired              boolean DEFAULT false,
  ADD COLUMN research_note         text;

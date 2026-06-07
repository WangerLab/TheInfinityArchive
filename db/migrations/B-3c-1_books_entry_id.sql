-- B-3c-1: add stable entry_id join-key to books
-- Applied via Supabase connector (apply_migration) against project
-- zekmlnnhczfdllbmxjec on 2026-06-07. Recorded here for traceability.
--
-- Overrides the B-3b §5 decision ("entry_id = import join-key only, not
-- stored"). Rationale: title-based joining is provably broken (44 of 161
-- DB rows drift from the master CSV across naming, omnibus structure, and
-- phase assignment). entry_id is the only stable, unique key for the CSV
-- seed (B-3c-2) and every future CSV re-sync (Sprint E) / Curator Mode
-- write. Storing it is cheaper over the project lifetime than re-deriving
-- title mappings on each data flow.

ALTER TABLE public.books
  ADD COLUMN entry_id text;

-- Backfill the 3 user_progress-bearing rows FIRST so their UUIDs survive the
-- B-3c-2 ON CONFLICT seed (FK from user_progress.book_id must not break).
UPDATE public.books SET entry_id = 'P0-01' WHERE id = 'e0d33e6c-f5c4-447f-811e-093fd68b4822'; -- Angels of Darkness
UPDATE public.books SET entry_id = 'P0-08' WHERE id = '4cb4dc00-9c90-4148-9321-2d3b11f70a98'; -- The Talon of Horus
UPDATE public.books SET entry_id = 'P0-03' WHERE id = '65b11694-c9b5-445c-9eb1-9491330c2604'; -- Ravenwing -> Legacy of Caliban: Ravenwing

-- Unique constraint enforced now; NULLs (the other 158 legacy rows) are allowed
-- and will be cleaned up in B-3c-3. Partial unique index excludes NULLs.
CREATE UNIQUE INDEX books_entry_id_key ON public.books (entry_id) WHERE entry_id IS NOT NULL;

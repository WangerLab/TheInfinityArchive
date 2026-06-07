-- B-3c-3: remove the 158 legacy NULL-entry_id catalog rows (pre-B-3c B-2 seed)
-- Applied via Supabase SQL Editor. Atomic (BEGIN..COMMIT), guarded.
--
-- Pre-verified before writing this migration:
--   * 0 legacy rows referenced by user_progress (the 3 progress rows hang on
--     entry_id-bearing rows P0-01/P0-03/P0-08, not on legacy rows).
--   * 0 seeded (entry_id-bearing) rows have a legacy parent_book_id
--     (the P0-03 stale pointer was nulled in B-3c-2's post-seed correction).
--   * books_parent_book_id_fkey is ON DELETE CASCADE, so legacy sub-items
--     whose parent is also legacy are removed together; the cascade stays
--     entirely within the legacy set and cannot reach seeded rows.
--   * books_phase_id_fkey is RESTRICT but irrelevant (no phases deleted).
--
-- After this migration: books holds exactly the 349 CSV-seeded rows.

BEGIN;

-- Guard 1: abort if any legacy row is still referenced by user_progress.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.user_progress up
    JOIN public.books b ON b.id = up.book_id WHERE b.entry_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'Abort: % user_progress row(s) still reference legacy books', n;
  END IF;
END $$;

-- Guard 2: abort if any seeded row would be reachable by the cascade
-- (i.e. has a legacy parent). Must be 0.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.books child
    JOIN public.books parent ON parent.id = child.parent_book_id
    WHERE child.entry_id IS NOT NULL AND parent.entry_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'Abort: % seeded row(s) have a legacy parent', n;
  END IF;
END $$;

-- Delete the legacy set. ON DELETE CASCADE handles legacy->legacy parent links.
DELETE FROM public.books WHERE entry_id IS NULL;

-- Verify final state: exactly 349 rows, all with entry_id, none NULL.
DO $$
DECLARE total int; nulls int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE entry_id IS NULL) INTO total, nulls FROM public.books;
  IF total <> 349 OR nulls <> 0 THEN
    RAISE EXCEPTION 'Abort: post-delete state wrong (total=%, nulls=%); expected 349/0', total, nulls;
  END IF;
END $$;

COMMIT;

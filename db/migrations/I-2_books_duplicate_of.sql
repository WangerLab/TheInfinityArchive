-- I-2: books.duplicate_of — mark cross-listings of the same novel
--
-- The reading plan lists one novel in two phases on purpose: Apocalypse (Josh
-- Reynolds) sits at P3-30 as a cross-reference and at P5-13 as its native entry
-- ("listed there natively", per also_in). The phase view is right to show both —
-- the plan says to meet the book in both places. The flat catalog is not: it
-- collapses every phase into one list, so the cross-listing surfaced as a
-- literal duplicate row, and the entry count read 176 for 175 books.
--
-- also_in already recorded this, but as freetext ("SAME NOVEL do not
-- double-count") — readable by a person, not by a query. duplicate_of says the
-- same thing in a column: the entry_id of the canonical row, NULL everywhere else.
--
-- P3-30 is the pointer and P5-13 the canonical row, following also_in. P5-13 is
-- also the richer of the two (POV Heyd Calder, Almace, Imperial Fists).
--
-- Pages are deliberately left alone. P3-30 carries 560 and P5-13 carries NULL,
-- so the global page counter already counts this novel exactly once. Moving the
-- count to the canonical row would shift 560 pages from Phase 3 to Phase 5 and
-- move both phases' progress bars — a change nobody asked for.
--
-- Two further cross-references exist (P3-26 -> P2-03.2, P7-23 -> P7-11.2) but
-- both point at omnibus children, which never appear at entry level. They are
-- not duplicates in any list and are not marked.

ALTER TABLE books ADD COLUMN duplicate_of text;

COMMENT ON COLUMN books.duplicate_of IS
  'entry_id of the canonical row when this row is a cross-listing of the same novel in a second phase. NULL for every native entry. The reading plan lists a novel in two phases on purpose and both must stay visible in the phase view; the flat catalog must show it once.';

UPDATE books
SET duplicate_of = 'P5-13'
WHERE entry_id = 'P3-30';

-- Post-state (verified against production):
--   1 row marked: P3-30 -> P5-13
--   0 dangling pointers
--   175 entry-level rows with duplicate_of IS NULL (was 176 counted)

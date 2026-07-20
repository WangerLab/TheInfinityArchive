-- M-2: resolve the five catch-all faction_primary "Sammelbuckets"
-- (Imperium, Chaos, Multiple, Imperium (Inquisition), Warhammer Horror --
-- 18 books) into real, specific faction values before the Strategium
-- meta-map seeds parent_faction from faction_primary. These buckets are
-- uninformative everywhere they're read (Auspex filters, sigil lookup), so
-- fixing the source column benefits every consumer, not just Strategium.
--
-- Resolution was per-book, reading title/sub_faction/faction_sigil/children:
--
-- 'Chaos' (4 rows, the Fabius Bile omnibus P3-17 + its 3 children): all
-- three children carry sub_faction 'The Consortium' / faction_sigil
-- 'emperors_children' -> faction_primary = 'Emperor''s Children' for parent
-- and children alike. grand_alliance was already 'chaos', unchanged.
--
-- 'Imperium' (9 rows, the Dawn of Fire series P5-03..P5-11) + 'Imperium
-- (Inquisition)' (1 row, P5-02): each already carries a specific
-- sub_faction and a correctly-derived faction_sigil identifying its real
-- POV faction -> faction_primary resolved per book from that signal
-- (Ultramarines, Adeptus Custodes, Space Wolves, Inquisition x3, Imperial
-- Knights, Adepta Sororitas, Adeptus Mechanicus). P5-09's sub_faction is
-- literally 'Imperial Navy' -- a genuinely new top-level faction, distinct
-- from the existing 'Navis Nobilite' (Navigator Houses are a different
-- in-universe body from the Navy fleet; not conflated). grand_alliance was
-- already 'imperium' for all ten, unchanged.
--
-- 'Multiple' (3 rows) and 'Warhammer Horror' (1 row) are all omnibus
-- parents with NULL sub_faction/sigil of their own -- resolved by reading
-- every child's faction_primary:
--   P6-53 'War for Armageddon: The Omnibus'  -- all 5 children are
--     'Adeptus Astartes' (unanimous) -> faction_primary = 'Adeptus
--     Astartes'. grand_alliance corrected 'unaligned' -> 'imperium' (it
--     was never actually mixed-alliance, just mislabeled).
--   P7-07 'The Dark Coil: Ascension (Omnibus)' -- 2 children split
--     Adeptus Astartes / Adepta Sororitas, no majority, but both imperium
--     -> faction_primary left NULL (better empty than invented; this
--     omnibus genuinely has no single faction home), grand_alliance
--     corrected 'unaligned' -> 'imperium' (both children agree on alliance
--     even though not on faction).
--   P3-12 'The Dark Coil: Damnation (Omnibus)' -- same pattern, children
--     split Astra Militarum / Adepta Sororitas, both imperium ->
--     faction_primary NULL, grand_alliance corrected -> 'imperium'.
--   P7-17 'Bastion Wars: The Omnibus' -- children span Inquisition +
--     Astra Militarum (imperium) AND Chaos Space Marines (chaos) ->
--     genuinely cross-alliance. faction_primary stays NULL, grand_alliance
--     stays 'unaligned' (the one case where that label was already right).
--
-- Applied live via Supabase MCP prior to this commit; this file records it.

UPDATE books
SET faction_primary = CASE entry_id
      WHEN 'P3-17'   THEN 'Emperor''s Children'
      WHEN 'P3-17.1' THEN 'Emperor''s Children'
      WHEN 'P3-17.2' THEN 'Emperor''s Children'
      WHEN 'P3-17.3' THEN 'Emperor''s Children'
      WHEN 'P5-02'   THEN 'Inquisition'
      WHEN 'P5-03'   THEN 'Ultramarines'
      WHEN 'P5-04'   THEN 'Adeptus Custodes'
      WHEN 'P5-05'   THEN 'Space Wolves'
      WHEN 'P5-06'   THEN 'Inquisition'
      WHEN 'P5-07'   THEN 'Imperial Knights'
      WHEN 'P5-08'   THEN 'Adepta Sororitas'
      WHEN 'P5-09'   THEN 'Imperial Navy'
      WHEN 'P5-10'   THEN 'Inquisition'
      WHEN 'P5-11'   THEN 'Adeptus Mechanicus'
      WHEN 'P6-53'   THEN 'Adeptus Astartes'
      WHEN 'P7-07'   THEN NULL
      WHEN 'P7-17'   THEN NULL
      WHEN 'P3-12'   THEN NULL
    END,
    grand_alliance = CASE entry_id
      WHEN 'P6-53' THEN 'imperium'
      WHEN 'P7-07' THEN 'imperium'
      WHEN 'P3-12' THEN 'imperium'
      ELSE grand_alliance
    END
WHERE entry_id IN (
  'P3-17','P3-17.1','P3-17.2','P3-17.3','P5-02','P5-03','P5-04','P5-05',
  'P5-06','P5-07','P5-08','P5-09','P5-10','P5-11','P6-53','P7-07','P7-17','P3-12'
);

-- Post-state (verified against production): zero remaining rows with
-- faction_primary IN ('Imperium','Chaos','Multiple','Imperium (Inquisition)',
-- 'Warhammer Horror'). 39 pre-existing NULL faction_primary rows (mostly
-- sub_item_optional, plus a few omnibus parents) are untouched -- they are
-- a separate, already-established gap (per Sprint F.1: not every row
-- carries every enrichment field), not part of this bucket-label fix.

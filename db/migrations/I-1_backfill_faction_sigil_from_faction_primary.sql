-- I-1: backfill faction_sigil from faction_primary
--
-- faction_sigil was seeded by regex over sub_faction — the POV-bearing faction.
-- 53 of 176 entry-level rows carry no sub_faction at all, so the seed left them
-- NULL and they were unreachable from any faction filter.
--
-- Falls back to faction_primary (the faction the book is ABOUT) where the POV
-- faction is unknown. This cannot introduce a sigil/tint conflict: grand_alliance
-- is itself derived from faction_primary, so a backfilled sigil and its alliance
-- agree by construction.
--
-- 42 rows filled. 11 stay NULL — all grand_alliance = 'unaligned' (Rogue Trader
-- retinues, 'Multiple', Warhammer Horror). They have no faction and should have
-- none; FactionSigil degrades to the alliance-level FactionMark for them.
--
-- Soul Drinkers map to astartes_generic, not imperial_fists: they are an Imperial
-- Fists successor but a distinct chapter with its own iconography, and the novels
-- do not present them under the Fists' mark. No soul_drinkers asset exists.

UPDATE books
SET faction_sigil = CASE btrim(split_part(faction_primary, ';', 1))
      WHEN 'Astra Militarum'     THEN 'astra_militarum'
      WHEN 'Inquisition'         THEN 'inquisition'
      WHEN 'Adeptus Mechanicus'  THEN 'admech'
      WHEN 'Ultramarines'        THEN 'ultramarines'
      WHEN 'Adeptus Arbites'     THEN 'arbites'
      WHEN 'Blood Angels'        THEN 'blood_angels'
      WHEN 'Adepta Sororitas'    THEN 'sororitas'
      WHEN 'Space Wolves'        THEN 'space_wolves'
      WHEN 'Grey Knights'        THEN 'grey_knights'
      WHEN 'Deathwatch'          THEN 'deathwatch'
      WHEN 'Salamanders'         THEN 'salamanders'
      WHEN 'Space Marines'       THEN 'astartes_generic'
      WHEN 'Soul Drinkers'       THEN 'astartes_generic'
      WHEN 'Word Bearers'        THEN 'word_bearers'
      WHEN 'Thousand Sons'       THEN 'thousand_sons'
      WHEN 'Chaos'               THEN 'chaos_generic'
      WHEN 'Iron Warriors'       THEN 'iron_warriors'
      WHEN 'Night Lords'         THEN 'night_lords'
      WHEN 'Drukhari'            THEN 'drukhari'
    END
WHERE parent_book_id IS NULL
  AND faction_sigil IS NULL
  AND btrim(split_part(faction_primary, ';', 1)) IN (
    'Astra Militarum','Inquisition','Adeptus Mechanicus','Ultramarines',
    'Adeptus Arbites','Blood Angels','Adepta Sororitas','Space Wolves',
    'Grey Knights','Deathwatch','Salamanders','Space Marines','Soul Drinkers',
    'Word Bearers','Thousand Sons','Chaos','Iron Warriors','Night Lords','Drukhari'
  );

-- Post-state (verified against production):
--   176 entry-level rows, 165 with a sigil, 11 NULL — all unaligned.
--   Two sigils still span two alliances, both correct and both intentional:
--     imperial_fists -> P5-13 Apocalypse (chaos: Word Bearers subject, Fists POV)
--     ultramarines   -> P5-31 Leviathan  (xenos: Tyranid subject, Ultramarine POV)

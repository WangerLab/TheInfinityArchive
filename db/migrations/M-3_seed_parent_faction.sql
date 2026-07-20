-- M-3: seed parent_faction (curated, Tim-approved during the Strategium
-- planning session) and normalize a lingering faction_primary duplicate.
--
-- Deathwatch existed as two spellings ('Adeptus Astartes (Deathwatch)' x3,
-- 'Deathwatch' x1) -- a pure dedup, no taste call, folded onto the single
-- value 'Deathwatch' before seeding.
--
-- Taxonomy:
--   Astartes chapters -> 'Adeptus Astartes' (Ultramarines, Blood Angels,
--   Dark Angels, Space Wolves, Salamanders, Imperial Fists, Soul Drinkers,
--   Deathwatch, Space Marines). The generic bare 'Adeptus Astartes' value
--   itself stays top-level (parent_faction NULL) -- it IS the mid-tier
--   node that these chapters expand from, not a sibling chapter of itself.
--
--   Chaos legions -> their patron god where a single legion is
--   god-aligned (Death Guard -> Nurgle, Thousand Sons -> Tzeentch, World
--   Eaters -> Khorne, Emperor's Children -> Slaanesh); the multi-legion /
--   unaligned-god legions collapse to 'Chaos Undivided' (Word Bearers,
--   Night Lords, Alpha Legion, Black Legion, Iron Warriors, Red Corsairs,
--   bare 'Chaos Space Marines').
--
--   Grey Knights -> 'Inquisition' (Tim's explicit call, overriding the
--   Astartes-pattern default -- Grey Knights are a Chamber Militant of the
--   Inquisition first in this taxonomy).
--
--   Drukhari stays a standalone top-level node (parent_faction NULL), not
--   nested under Aeldari -- distinct enough in lore and in this catalog.
--
--   Everything else (Astra Militarum, Adepta Sororitas, Inquisition,
--   Adeptus Mechanicus, Adeptus Custodes, Imperial Knights, Adeptus
--   Arbites, Officio Assassinorum, Navis Nobilite, Imperial Navy,
--   Enforcers, all Xenos factions) stays top-level: NULL by omission.
--
-- Applied live via Supabase MCP prior to this commit; this file records it.
-- Dry-run verified counts before apply: 56 Adeptus Astartes, 18 Chaos
-- Undivided, 8 Tzeentch, 6 Slaanesh, 5 Inquisition (via Grey Knights),
-- 1 Nurgle, 1 Khorne, 269 top-level/no-parent.

UPDATE books
SET faction_primary = 'Deathwatch'
WHERE faction_primary = 'Adeptus Astartes (Deathwatch)';

UPDATE books
SET parent_faction = CASE faction_primary
  WHEN 'Ultramarines'         THEN 'Adeptus Astartes'
  WHEN 'Blood Angels'         THEN 'Adeptus Astartes'
  WHEN 'Dark Angels'          THEN 'Adeptus Astartes'
  WHEN 'Space Wolves'         THEN 'Adeptus Astartes'
  WHEN 'Salamanders'          THEN 'Adeptus Astartes'
  WHEN 'Imperial Fists'       THEN 'Adeptus Astartes'
  WHEN 'Soul Drinkers'        THEN 'Adeptus Astartes'
  WHEN 'Deathwatch'           THEN 'Adeptus Astartes'
  WHEN 'Space Marines'        THEN 'Adeptus Astartes'
  WHEN 'Death Guard'          THEN 'Nurgle'
  WHEN 'Thousand Sons'        THEN 'Tzeentch'
  WHEN 'World Eaters'         THEN 'Khorne'
  WHEN 'Emperor''s Children'  THEN 'Slaanesh'
  WHEN 'Word Bearers'         THEN 'Chaos Undivided'
  WHEN 'Night Lords'          THEN 'Chaos Undivided'
  WHEN 'Alpha Legion'         THEN 'Chaos Undivided'
  WHEN 'Black Legion'         THEN 'Chaos Undivided'
  WHEN 'Iron Warriors'        THEN 'Chaos Undivided'
  WHEN 'Red Corsairs'         THEN 'Chaos Undivided'
  WHEN 'Chaos Space Marines'  THEN 'Chaos Undivided'
  WHEN 'Grey Knights'         THEN 'Inquisition'
  ELSE parent_faction
END;

-- Verification post-apply: querying distinct faction_primary values grouped
-- with a NULL-faction_sigil count found zero real faction NODES fully
-- uncovered -- the only gaps left are a handful of individual books inside
-- otherwise-sigil'd factions (1 Adeptus Astartes, 1 Adeptus Mechanicus, 2
-- Necrons), which the existing fallback-glyph design already handles.
-- No further sigil seed required for the Strategium build.

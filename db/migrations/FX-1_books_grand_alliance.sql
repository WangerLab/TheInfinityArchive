-- Sprint FX-1: derive a coarse Grand Alliance from the fine-grained
-- faction_primary, so the phase-view faction filter has a stable, queryable
-- axis (47 distinct faction_primary values collapse to 4 alliances).
-- Mapping is curated (Tim-approved); Soul Drinkers -> imperium (start loyal),
-- Genestealer Cults / Leagues of Votann -> xenos. NULL / 'Multiple' /
-- 'Warhammer Horror' -> unaligned.
-- Applied live via Supabase MCP prior to this commit; this file records it.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS grand_alliance text;

UPDATE public.books
SET grand_alliance = CASE
  WHEN faction_primary IN (
    'Astra Militarum','Adeptus Astartes','Adepta Sororitas','Inquisition','Ultramarines',
    'Adeptus Mechanicus','Blood Angels','Dark Angels','Imperium','Grey Knights',
    'Adeptus Arbites','Salamanders','Adeptus Astartes (Deathwatch)','Adeptus Custodes',
    'Imperial Knights','Space Wolves','Enforcers','Deathwatch','Imperial Fists',
    'Imperium (Inquisition)','Navis Nobilite','Officio Assassinorum','Space Marines','Soul Drinkers'
  ) THEN 'imperium'
  WHEN faction_primary IN (
    'Thousand Sons','Word Bearers','Night Lords','Alpha Legion','Black Legion',
    'Emperor''s Children','Iron Warriors','Chaos','Chaos Space Marines','Death Guard',
    'Red Corsairs','World Eaters'
  ) THEN 'chaos'
  WHEN faction_primary IN (
    'Aeldari','Necrons','Drukhari','T''au','Orks','Genestealer Cults',
    'Leagues of Votann','Tyranids'
  ) THEN 'xenos'
  ELSE 'unaligned'
END;

-- Enforce the invariant: every row carries exactly one alliance, no NULLs.
ALTER TABLE public.books
  ALTER COLUMN grand_alliance SET NOT NULL;

ALTER TABLE public.books
  ADD CONSTRAINT books_grand_alliance_check
  CHECK (grand_alliance IN ('imperium','chaos','xenos','unaligned'));

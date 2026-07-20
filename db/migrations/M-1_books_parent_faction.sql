-- M-1: add parent_faction, the first Strategium data prerequisite.
--
-- The Strategium meta-map clusters faction nodes two-deep: an alliance
-- volume (grand_alliance, already exists) containing faction nodes, with a
-- mid-tier expansion for umbrella factions (Adeptus Astartes -> chapters,
-- Chaos legions -> patron god). parent_faction records that second tier.
-- Open vocabulary (no CHECK) unlike grand_alliance's closed 4-value enum --
-- the taxonomy is curated per-faction below, not exhaustive by construction.
--
-- Applied live via Supabase MCP prior to this commit; this file records it.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS parent_faction text;

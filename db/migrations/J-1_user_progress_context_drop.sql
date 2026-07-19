-- J-1: Context Drop reflection columns on user_progress
--
-- The Context Drop is a separate reflection mechanism from the existing
-- manual fields (personal_take, notes = Marginalia), which the BookDetail
-- reflection UI writes directly. This migration is purely ADDITIVE: it adds
-- the six Context Drop columns alongside the manual fields (Option 1 —
-- coexistence). No existing column is touched or migrated.
--
-- Flow: user dictates -> Sonnet 4.6 structures -> stored as:
--   context_drop_raw  = the raw dictation, hidden, audit trail only
--   chronicle         = Block A (human-facing prose, spoilers allowed):
--                       { resonance, standout_moment, verdict_line }
--   auspex_reading    = Block B (machine-readable, Strategium input,
--                       collapsed by default in UI):
--                       { emotional_register[], intensity, appetite_direction,
--                         fatigue_signals, faction_resonance, thematic_hooks }
--
-- jsonb (not separate columns) because Block A is authored/read as a unit and
-- Block B is queried by the Strategium with jsonb operators across many books
-- (e.g. auspex_reading->'emotional_register' @> '["harrowed"]' over the last N).
--
-- context_drop_at    = recency signal; feeds the "three bleak books in a row"
--                      pattern logic. context_drop_model / _schema_version are
--                      audit + forward-compat guards (model swaps, vocabulary
--                      expansion) — cheap now, save a painful migration later.

ALTER TABLE public.user_progress
  ADD COLUMN context_drop_raw            text,
  ADD COLUMN chronicle                   jsonb,
  ADD COLUMN auspex_reading              jsonb,
  ADD COLUMN context_drop_at             timestamptz,
  ADD COLUMN context_drop_model          text,
  ADD COLUMN context_drop_schema_version smallint;

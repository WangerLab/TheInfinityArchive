-- C-1: personal_take reflection column on user_progress
-- Applied manually via Supabase connector (apply_migration) against project
-- zekmlnnhczfdllbmxjec on 2026-07-05. Recorded here for traceability.
--
-- Sprint C (Reflection Capture) adds ONE new reflection column. The existing
-- `notes` column is reused as the loose free-notes field (it was already wired
-- through the progress hook but never surfaced in the UI). personal_take is the
-- distilled verdict. The PENDING-reflection marker is NOT stored: it is derived
-- in the app layer as (status = 'read' AND personal_take IS NULL/empty), the
-- same never-let-a-marker-diverge principle as the is_read generated column.
-- Nullable, no default, no backfill: all existing READ books become legitimately
-- PENDING until Tim writes a take.

ALTER TABLE public.user_progress
  ADD COLUMN personal_take text;

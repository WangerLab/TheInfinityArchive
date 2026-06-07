-- B-3a: reading lifecycle status on user_progress
-- Applied manually via Supabase connector (apply_migration) against project
-- zekmlnnhczfdllbmxjec on 2026-06-07. Recorded here for traceability.
--
-- Henne-Ei: is_read cannot become a generated column while the hook still
-- writes it and data lives in it, so we backfill status from is_read first,
-- drop the writable boolean, then re-add is_read as a generated column.

-- 1. Add status as a normal text column (all existing rows default to 'unread')
ALTER TABLE public.user_progress
  ADD COLUMN status text NOT NULL DEFAULT 'unread'
  CHECK (status IN ('unread', 'reading', 'read'));

-- 2. Backfill status from the existing is_read boolean (lossless: read<->'read')
UPDATE public.user_progress
  SET status = CASE WHEN is_read THEN 'read' ELSE 'unread' END;

-- 3. Add started_at (nullable). Legacy rows are NOT backfilled (no invented date).
ALTER TABLE public.user_progress
  ADD COLUMN started_at timestamptz;

-- 4. Drop the old writable is_read boolean column
ALTER TABLE public.user_progress
  DROP COLUMN is_read;

-- 5. Re-add is_read as a generated column derived from status.
--    From now on is_read is read-only and can never diverge from status.
ALTER TABLE public.user_progress
  ADD COLUMN is_read boolean GENERATED ALWAYS AS (status = 'read') STORED;

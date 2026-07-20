-- N-1: recommendations_log -- the Strategium advisor's track record.
--
-- Recommendations themselves are ephemeral/runtime-only (spec §6): the
-- advisor generates exactly 3 per query and they are never re-shown as
-- stored state. This table records the EVENT instead -- what was asked,
-- what was recommended -- so a track record accumulates over years without
-- needing to keep any single recommendation "live". Append-only: no
-- UPDATE/DELETE policy, since editing a past advisory event after the fact
-- has no use case.
--
-- Mirrors user_progress's per-user RLS pattern (select/insert own rows via
-- auth.uid() = user_id), scoped down to the two operations this table
-- actually needs.
--
-- Applied live via Supabase MCP prior to this commit; this file records it.

CREATE TABLE public.recommendations_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  query_context    jsonb NOT NULL,
  recommendations  jsonb NOT NULL
);

CREATE INDEX recommendations_log_user_id_idx ON public.recommendations_log(user_id, created_at DESC);

ALTER TABLE public.recommendations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommendations_log_select_own ON public.recommendations_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY recommendations_log_insert_own ON public.recommendations_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

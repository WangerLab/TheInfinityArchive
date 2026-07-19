-- K-1: music_scenes column on user_progress
--
-- A third consumer of the Context Drop, beyond the human (chronicle) and the
-- Strategium (auspex_reading): the Suno music workflow. When the reader
-- explicitly marks a scene during dictation ("scene for music: ..."), the model
-- extracts it here. A downstream local LLM queries this column independently to
-- pull resonant scenes and generate songs from them.
--
-- Own column (not folded into chronicle or auspex_reading) because the Suno
-- connector is a standalone consumer that queries scenes across books on their
-- own axis, e.g. SELECT ... WHERE music_scenes IS NOT NULL. Additive; nothing
-- existing is touched.
--
-- Shape: jsonb array of objects, e.g.
--   [{ "scene": "...", "note": "why it resonates / song idea" }]
-- Empty/null when the reader marked no scenes — the model never invents them.

ALTER TABLE public.user_progress
  ADD COLUMN music_scenes jsonb;

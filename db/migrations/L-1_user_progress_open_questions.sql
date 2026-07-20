-- L-1: open_questions column on user_progress
--
-- Part of the interview step. The context-drop model returns open_questions
-- alongside chronicle/auspex_reading/music_scenes: points where the reflection
-- would benefit from the reader clarifying (correction: a possibly mis-dictated
-- proper noun) or expanding (deepening: an under-developed thread).
--
-- Persisted here so the draft survives a tab close or a failed follow-up call:
-- the Chronicle is saved immediately with its open_questions attached, rather
-- than held in a fragile in-memory pending state. Cleared (empty array / null)
-- once the reader answers or dismisses the questions.
--
-- Shape: jsonb array of objects, e.g.
--   [{ "type": "correction", "question": "...", "context": "Cepharil" }]
-- Empty/null when the model raised none. Additive; nothing existing is touched.

ALTER TABLE public.user_progress
  ADD COLUMN open_questions jsonb;

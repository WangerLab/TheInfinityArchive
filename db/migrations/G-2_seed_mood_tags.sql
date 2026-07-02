-- Sprint G, Commit 2: seed distinct mood values into tags (mood scope)
-- Sourced directly from books.mood_tags[] arrays — no hand-typed value list,
-- so no apostrophe-escaping risk (B-3c §5). Idempotent via ON CONFLICT.
-- Verified live before this commit: 249 rows, no case/whitespace duplicates.

INSERT INTO public.tags (name, type)
SELECT DISTINCT trim(unnest(mood_tags)) AS name, 'mood' AS type
FROM public.books
WHERE mood_tags IS NOT NULL
ON CONFLICT (name, type) DO NOTHING;

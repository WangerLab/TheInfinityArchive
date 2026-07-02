-- Sprint G, Commit 3: seed book_tags junction (mood scope)
-- Sourced directly from books.mood_tags[] via unnest + join onto tags.
-- Idempotent (ON CONFLICT DO NOTHING). Dry-run verified before live insert:
-- expected_pairs == book_join_hits == tag_join_hits == 1131 (F-Lektion),
-- real insert == 1131 links.

INSERT INTO public.book_tags (book_id, tag_id)
SELECT DISTINCT b.id, tg.id
FROM public.books b
CROSS JOIN LATERAL unnest(b.mood_tags) AS t(val)
JOIN public.tags tg ON tg.name = trim(t.val) AND tg.type = 'mood'
WHERE b.mood_tags IS NOT NULL
ON CONFLICT (book_id, tag_id) DO NOTHING;

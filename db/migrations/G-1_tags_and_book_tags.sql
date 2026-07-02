-- Sprint G, Commit 1: tags + book_tags M:N structure (mood scope)
-- Mirrors the series/book_series model from Sprint F.
-- Only mood_tags are normalised this sprint; semantic_tags stay as an
-- array on books (AI-companion context, 73% singletons, no filter value).

CREATE TABLE public.tags (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'mood'
             CHECK (type IN ('mood')),  -- open value-list, extend when semantic/theme/region land
  CONSTRAINT tags_name_type_unique UNIQUE (name, type)
);

CREATE TABLE public.book_tags (
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);

CREATE INDEX book_tags_tag_id_idx ON public.book_tags(tag_id);

ALTER TABLE public.tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated, like phases/books/series/book_series
CREATE POLICY tags_read_authenticated ON public.tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY book_tags_read_authenticated ON public.book_tags
  FOR SELECT TO authenticated USING (true);

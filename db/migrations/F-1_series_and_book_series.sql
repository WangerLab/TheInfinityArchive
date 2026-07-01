-- Sprint F-1: series identity + book<->series junction
-- Rationale: series data is 1:N on entry_id but requires its own identity
-- (non-numeric ordering, also_in cross-phase bridge). Flat columns on books
-- were deliberately excluded (B-3c §5); this is the planned M:N table.

CREATE TABLE public.series (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  sort_order integer,
  CONSTRAINT series_name_key UNIQUE (name)
);

CREATE TABLE public.book_series (
  book_id       uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  series_id     uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  order_label   text,     -- lossless CSV series_order (#1, omnibus, short-prequel, standalone, ...)
  sort_position numeric,  -- deterministic ordering within a series; numeric to allow 0.5
  PRIMARY KEY (book_id, series_id)
);

CREATE INDEX book_series_series_id_idx ON public.book_series (series_id);

-- RLS: read-only for authenticated users, matching phases/books
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY series_read ON public.series
  FOR SELECT TO authenticated USING (true);

CREATE POLICY book_series_read ON public.book_series
  FOR SELECT TO authenticated USING (true);

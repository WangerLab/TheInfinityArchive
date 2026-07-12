-- H-1: unpack the four Gaunt's Ghosts omnibuses into real sub_item rows.
--
-- P6-01..P6-04 existed as is_omnibus entries whose volumes lived only as
-- freetext in the source CSV's omnibus_contents column (a column that was
-- never carried into public.books). Unlike all other omnibuses they had no
-- sub_item children, so the catalog counted them as 1 item each instead of
-- unpacking them: 303 items instead of 314.
--
-- Page counts are an even split of each omnibus's own page total (768/3,
-- 1024/4, 1024/4, 1597/4 with the remainder on the first volume). No
-- per-volume figure is published by BL or Lexicanum, and the frontend's
-- counters ignore a parent's own `pages` as soon as it has children — so the
-- split is what keeps the global page total unchanged at 89,624. Confidence
-- is therefore recorded as 'low'.
--
-- Applied live via the Supabase MCP connector; this file is the record.
-- Dry-run before insert (F-lesson): seed_rows == parent_join_hits == 15,
-- already_existing == 0, seed_pages == parent_pages == 4413.

WITH seed(parent_entry, entry_id, title, pages, sort_order) AS (VALUES
 ('P6-01','P6-01.1','First and Only',256,101),
 ('P6-01','P6-01.2','Ghostmaker',256,102),
 ('P6-01','P6-01.3','Necropolis',256,103),
 ('P6-02','P6-02.1','Honour Guard',256,201),
 ('P6-02','P6-02.2','The Guns of Tanith',256,202),
 ('P6-02','P6-02.3','Straight Silver',256,203),
 ('P6-02','P6-02.4','Sabbat Martyr',256,204),
 ('P6-03','P6-03.1','Traitor General',256,301),
 ('P6-03','P6-03.2','His Last Command',256,302),
 ('P6-03','P6-03.3','The Armour of Contempt',256,303),
 ('P6-03','P6-03.4','Only in Death',256,304),
 ('P6-04','P6-04.1','Blood Pact',400,401),
 ('P6-04','P6-04.2','Salvation''s Reach',399,402),
 ('P6-04','P6-04.3','The Warmaster',399,403),
 ('P6-04','P6-04.4','Anarch',399,404)
)
INSERT INTO books (phase_id, parent_book_id, title, author, pages, type, tags, sort_order,
                   is_omnibus, row_type, entry_id, sub_faction, faction_primary,
                   grand_alliance, faction_sigil, track, format,
                   location_primary, page_count_confidence)
SELECT 6, p.id, s.title, 'Dan Abnett', s.pages, 'novel', '{}'::text[], s.sort_order,
       false, 'sub_item', s.entry_id, 'Tanith First and Only', 'Astra Militarum',
       'imperium', 'astra_militarum', 'core', 'novel',
       'Sabbat Worlds', 'low'
FROM seed s JOIN books p ON p.entry_id = s.parent_entry;

-- All fifteen are pre-project reads (complete), so they are marked read for
-- every existing user.
INSERT INTO user_progress (user_id, book_id, status, started_at, completed_at)
SELECT up.user_id, b.id, 'read', now(), now()
FROM books b
CROSS JOIN (SELECT DISTINCT user_id FROM user_progress) up
WHERE b.entry_id ~ '^P6-0[1-4]\.[1-4]$'
ON CONFLICT (user_id, book_id) DO NOTHING;

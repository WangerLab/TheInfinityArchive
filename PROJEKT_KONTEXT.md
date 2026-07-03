# PROJEKT_KONTEXT

High-level architecture, current sprint state, and external service IDs
for The Infinity Archive. Updated at the end of every sprint.

## Purpose

Personal reading tracker for Tim's curated Warhammer 40,000 reading
journey (Black Library Grand Reading Project, BL-GRP). Tracks progress
across ~108 books in 8 thematic phases, with recursive omnibus
handling, skull ratings, and per-book notes.

Single user. Built properly anyway — auth, real backend, sane
architecture.

## Current Sprint

**Interface/Navigation Rework (COMPLETE)**

Moving from the single-screen model (Phase list bolted to a header filter bar) to
a multi-view shell. IA decided this session: FIVE views — Landing (new hub),
Phase, Archive (catalog-wide browse/filter — new home for the allegiance filter
AND the mood filter), Analysis (NEW — sober filterable stats, split OUT of Service
Record), Map, Service Record (now immersion/lore only). This splits the Vision
v1.1 four-view model → v1.2 (Analysis promoted); Vision doc update pending.

Structural commits (3, live-verified pixel-identical):
- 0c664f4 — install react-router-dom (v7), wrap app in BrowserRouter, catch-all route
- 610c4b4 — lift data layer into ArchiveDataProvider (context); view → pure consumer
- 41a90d4 — extract PhaseView page from ArchiveApp; App.js = pure router wiring

Visible nav block (3, skeleton-first, all live-verified on Vercel):
- 75cba88 — vercel.json SPA rewrite (deep-link/hard-refresh survive client routes)
- 56364ac — real routes: / → Landing skeleton, /phases → PhaseView, catch-all → redirect
- 2591cda — persistent nav via layout route (AppLayout = AppNav + Outlet); nav on app views, not on Landing

Sprint closed: routing, redirect, deep-link survival, and persistent nav all
live-verified. GlobalHeader untouched (nav↔header relationship is a skinning
decision). Next, in their own chats: (a) skin the Landing against
TIA-Design-Briefs.md now the mechanics hold; (b) Archive View as the next route
under AppLayout — new home for the deferred mood-filter. Still pending: Vision
v1.1 → v1.2 doc update (Analysis promoted to its own fifth view). Per-view Design
briefs live in Project Knowledge (TIA-Design-Briefs.md), grounded in the real CSS
tokens.

**Sprint G — tags/book_tags M:N (mood scope) (COMPLETE)**

Built the queryable tag M:N structure deferred since B-3b, scoped to mood only.
Two tables mirroring the F series model: `public.tags` (id, name, type; type
CHECK ('mood') only for now, OPEN value-list; UNIQUE(name,type)) and
`public.book_tags` (book_id, tag_id, PK(book_id,tag_id), both FKs ON DELETE
CASCADE, index on tag_id). RLS read-only for authenticated. Diagnosis drove the
scope: mood_tags (249 distinct, shared vocabulary, avg 3.8/book) normalises
well; semantic_tags (2004 distinct, 73% singletons, avg 12.6/book) is
AI-companion context and stays a plain array; legacy tags[] is effectively
empty. Seeded directly from books.mood_tags[] via unnest (no hand-typed VALUES).
Dry-run verified before the junction insert (expected == book-join == tag-join
== 1131); real insert 1131. Final: tags 249 / book_tags 1131 / 298 books linked.
3 DB-only commits, all on main: 63d1019 (G-1 tables+RLS), 40ab391 (G-2 seed 249
mood values), 2d40e9a (G-3 seed 1131 junction links). Vercel READY (no visible
change — the UI does not consume the junction yet; moodTags already renders from
the array since E.1). The mood-filter UI was deliberately NOT built: Tim opened
an interface/navigation rework question (multi-area landing/browse/analysis
structure) that must be settled against the Vision v1.1 four-view plan before
more filter UI lands. Filter data is ready for whatever the UI becomes. Lesson
in CLAUDE.md (normalise the shared-vocabulary field; leave the singleton field
an array until its consumer exists).

**Sprint F.1 — grand-alliance faction filter (COMPLETE)**

Turned the never-wired "strategic filter" (dead UI since v1) into a working
4-way faction filter. A curated CASE mapping collapses the 47 distinct
`faction_primary` values to 4 alliances stored in a new NOT NULL,
CHECK-constrained `books.grand_alliance` column
(imperium 239 / chaos 34 / xenos 33 / unaligned 43 = 349). Mapping is
Tim-approved: Soul Drinkers→imperium (start loyal), Genestealer Cults /
Leagues of Votann→xenos; NULL / 'Multiple' / 'Warhammer Horror'→unaligned.
The migration was applied live via Supabase MCP and verified before the
repo commit. `grandAlliance` is threaded through `useCatalog` onto both
entry and omnibus-child shapes; `PhaseDetail` filters the rendered list by
it BEFORE the map (Rule A — per-row, parents match on their own alliance,
children not individually inspected); phase stats keep using the full
unfiltered list so progress is unaffected. `GlobalHeader` gains the fourth
button (UNALIGNED, Skull icon) and is relabelled ALLEGIANCE; the first
three button ids already matched grand_alliance. Shipped in six commits:
FX-1 (6e04473) grand_alliance column + backfill; FX-2 (177edcb) thread into
useCatalog; FX-3 (1f4138e) apply filter in PhaseDetail; FX-4 (d32ba42)
alliance buttons; F.1-5 (487f4ca) CLAUDE.md lessons; F.1-6 (this)
PROJEKT_KONTEXT. Vercel production READY on d32ba42 (verified by Tim).
Lesson in CLAUDE.md: faction_primary is populated at every row level, not
just children — the omnibus-empty rule is per-field, verify by query.
Deferred (not F.1 scope): dead activeFilters prop on RecursiveBookEntry;
key={book.title} in PhaseDetail should be entryId.

**Sprint F — series/saga M:N model + phase-view badge (COMPLETE)**

Introduced first-class series identity, the M:N model deliberately deferred
since B-3c (flat series/series_order columns were never added to books to avoid
implying a 1:1 model). Two tables: `public.series` (55 rows, UNIQUE name) and
`public.book_series` (234 links, PK (book_id, series_id), RLS read-only for
authenticated like phases/books). Seeded from BLGRPMasterMetadatav2.csv via
entry_id/name joins (UUIDs resolved at runtime, no hardcoded ids). order_label
preserves the raw CSV series_order losslessly; sort_position is derived
(omnibus=-100, short-prequel=-1, #n/n=n, short=9000, standalone=9999,
empty=NULL) with books.sort_order as runtime tiebreaker. Two CSV spelling
variants were canonicalised (The Twice-Dead King; Jarnhamar). The one true
work-level M:N case is the also_in cross-phase 'Apocalypse' (P3-30 & P5-13,
both #5 in Space Marine Conquests) — two book rows, one series position, which
a flat column could not have represented. useCatalog threads
series: { name, orderLabel, sortPosition } | null onto every book and sub-item;
RecursiveBookEntry renders a subtle gold SeriesBadge (#n / Omnibus shown,
sort-only pseudo-labels suppressed). Shipped in six commits: F-1 (433c630)
tables+RLS; F-2 (2aef069) seed 55 series; F-3 (41a01ec) seed 234 junction
links; F-4 (fd51cb5) thread series into useCatalog shape; F-5 (484431c) render
badge; F-6 (this) docs. Vercel production READY on 484431c.

**Sprint E.1 — catalog enrichment in Phase/Archive views (COMPLETE)**

Surfaced the enriched metadata from Sprint E's 349-row catalog in the UI:
location (+ segmentum), in-universe date, protagonist, spoiler-free summary,
and mood tags now render on catalog entries — on top-level books AND on
expanded omnibus children (children carry full enrichment in the DB; the
child render-shape was narrow). Also removed a redundant duplicate header in
the expanded phase panel. Shipped in seven commits (one intentional revert):
f032de1 top-level shape; f0f18a2 render into WRONG component (BookEntry.jsx,
dead code, reverted); aa799ac render into RecursiveBookEntry (the component the
phase view actually uses); 833d406 child shape; a0c6e3f render on expanded
omnibus children; 5fd5694 collapse redundant PhaseDetail header to a slim bar;
79a9d44 revert f0f18a2. Net over Sprint E: 3 files (useCatalog.js,
RecursiveBookEntry.jsx, PhaseDetail.jsx) — BookEntry.jsx nets to zero.
semantic_tags / key_characters / sub_faction / faction_primary are threaded
into the shape but deliberately NOT rendered yet (reserved for Map View / AI
Companion / faction filters). Vercel production READY on 79a9d44. Lesson in
CLAUDE.md (verify the render chain before a UI commit).

**Sprint E — catalog render from Supabase (COMPLETE)**

The frontend now renders the catalog from Supabase (phases + books) via the
new `useCatalog` hook, replacing the static project_data.json fetch. This
closes the frontend<->DB divergence from B-3c: the DB is now the single source
of truth for BOTH catalog and progress. Shipped in five commits: E-1 (52d4a00)
useCatalog hook; E-2a (af0099c) + E-2b (126e61f) move progress state keying
from title to entry_id (titles are non-unique in the 349-row catalog); E-3
(4986d6a) swap App.js catalog source JSON->useCatalog; E-4 (074864b) remove
the static project_data.json. Runtime-verified before the E-3 commit; Vercel
production READY on 074864b.

**Prior: Sprint B-3c — full BL-GRP metadata seed into Supabase (COMPLETE)**

Brought `public.books` from the partial 161-row B-2 catalog to the full,
metadata-enriched 349-row master from `BLGRPMasterMetadatav2.csv`. The
catalog is now the authoritative reading-list truth in the database (the
frontend still renders from static JSON — see Data Structure). Shipped in
three commits:

- B-3c-1 (`deca034`): add stable `entry_id` join-key to `books` (full
  `UNIQUE` constraint), backfill the 3 user_progress-bearing rows
  (P0-01/P0-03/P0-08) so their UUIDs survive the seed. Deliberately
  overrides the B-3b §5 decision not to store `entry_id` — title-based
  joining was proven unreliable (44 of 161 rows drift across naming,
  omnibus structure, and phase assignment).
- B-3c-2 (`b8db252`): full 349-row seed via `ON CONFLICT (entry_id)`
  upsert, two-pass (176 entries, then 173 sub-items with `parent_book_id`
  self-join). Applied through the Supabase SQL Editor in two atomic halves
  (the 274 KB file could not be routed reliably through `apply_migration`).
- B-3c-3 (`7df9c73`): guarded, atomic cleanup of the 158 legacy
  NULL-entry_id rows from the old B-2 seed.

DB verified post-sprint: 349 total, 0 NULL entry_id, 176 entries + 173
sub-items (133 `sub_item` + 40 `sub_item_optional`), 173 valid parent
links, 0 orphans, 3 user_progress links intact, apostrophes preserved in
text[] tags (e.g. `C'tan`, `El'Jonson`).

**Prior: Sprint B-2 — localStorage → Supabase data layer (COMPLETE)**

Replaced the localStorage progress layer with a Supabase-backed one.
Per-book progress now persists to `public.user_progress`; the catalog
still loads from the static JSON. Shipped in four commits:

- B-2a: `useSupabaseProgress` hook (title-keyed shape mirroring the old
  useLocalStorage signature; debounced diff-based upsert; phantom-parent-
  row guard for omnibus sub-items)
- B-2b-1: behavior-neutral refactor — extract `ArchiveApp` so the data
  layer renders under AuthGate (see CLAUDE.md lesson)
- B-2b-2: the actual swap, `useLocalStorage` → `useSupabaseProgress` in
  ArchiveApp
- B-2c: delete unused `useLocalStorage.js`

Verified locally and on the Vercel production deploy: top-level books,
omnibus sub-items, and updates all persist correctly to user_progress;
no phantom parent rows.

## Tech Stack — Current State

| Layer       | Current state                                | Target (Sprint B-2+)              |
|-------------|----------------------------------------------|-----------------------------------|
| Frontend    | React 19, Tailwind, plain react-scripts      | Unchanged                         |
| Build       | CRA-native, `baseUrl: "src"`, bare imports   | Unchanged                         |
| Dependencies| 12 (cleaned in B-0, down from 52)            | +1 (@supabase/supabase-js in B-1a)|
| State       | Supabase only (`useSupabaseProgress`)        | — (B-2 complete)                  |
| Auth        | None                                         | Supabase Magic Link (B-1b)        |
| Backend     | Supabase active: auth + user_progress (lifecycle status, B-3a) + books with 22 metadata cols (B-3b) seeded full 349-row catalog (B-3c) + series/book_series M:N (F) + tags/book_tags M:N mood scope (G) | — |
| Hosting     | Vercel, live, auto-deploys main              | Unchanged                         |

## Data Structure

The catalog render is sourced from Supabase (`public.phases` +
`public.books`) via the `useCatalog` hook, which reassembles the relational
rows into the `projectData` shape App.js renders from. 8 phases (id 0-7),
each with `books[]`. Books are either single novels
(`{entryId, title, author, pages, type, tags}`) or omnibuses with nested
`contents[]` for sub-items (`{entryId, title, pages, type}`). The static
`frontend/public/data/project_data.json` that previously drove the render
was removed in Sprint E (E-4).

Supabase `public.books` now holds the full master catalog: 349 rows
(176 entries + 173 sub-items) seeded from `BLGRPMasterMetadatav2.csv`
in Sprint B-3c, with all 22 BL-GRP metadata columns populated (pub_year,
location, protagonist, key_characters, faction, mood_tags, semantic_tags,
spoiler_free_summary, etc.). The stable join-key is `entry_id`
(e.g. `P0-01`, `P6-32.5`); sub-items link to parents via `parent_book_id`.

**Frontend↔DB divergence — CLOSED in Sprint E.** The frontend previously
rendered the catalog from the static 161-row `project_data.json` while the DB
carried the richer 349-row truth. Sprint E closed this gap: the catalog render
now comes from `public.phases` + `public.books` via `useCatalog`, and
`project_data.json` was removed (E-4). The DB is now the single source of
truth for both catalog and progress.

Per-book user progress is persisted in Supabase `public.user_progress`,
read and written via the `useSupabaseProgress` hook. The hook
reconstructs an `entry_id`-keyed in-memory object (since E-2a; titles are
non-unique in the 349-row catalog) from the relational rows, and writes
back via debounced diff-based upsert keyed on `(user_id, book_id)`. Each
entry/sub-item resolves to its `book_id` via `entry_id`; user_progress
still stores `book_id` (UUID) — only the in-memory indexing changed. The
hook skips writing phantom parent rows for omnibus containers that have no
progress of their own. The
`isSubItemRead()` helper in App.js still normalizes the old boolean
sub-item format for the in-memory shape.

Supabase progress schema (B-2, extended B-3a):
`public.user_progress` table with `user_id` (FK auth.users), `book_id`
(FK books.id), `status` ('unread'/'reading'/'read', NOT NULL), `is_read`
(generated column derived from status — read-only, can never diverge),
`started_at`, `rating` (1-5), `notes`, `completed_at`, `updated_at`. RLS
enforces `auth.uid() = user_id` for all writes and reads. The upsert path
writes `status`; `is_read` follows automatically.

## External Services

| Service  | Status | ID / URL                                                  |
|----------|--------|-----------------------------------------------------------|
| GitHub   | Active | WangerLab/TheInfinityArchive (auto-delete head branches ON)|
| Supabase | Active | Project ID `zekmlnnhczfdllbmxjec`, region `eu-central-1`, Free Tier. Dashboard: https://supabase.com/dashboard/project/zekmlnnhczfdllbmxjec |
| Vercel   | Active | Project `the-infinity-archive` (Hobby tier), prod URL https://the-infinity-archive-jade.vercel.app, Root Directory `frontend/`, auto-deploys `main`. Env vars `REACT_APP_SUPABASE_URL` + `REACT_APP_SUPABASE_ANON_KEY` set for Production + Preview. |

## Next Sprints (planned, not committed)

- **Sprint B-3 (optional):** Pre-Supabase localStorage data migration
  for Tim's existing reading state across devices.
- **Sprint B-4 (optional polish):** logout flow polish, error/loading
  auth states, fix `packageManager: yarn@...` field in package.json
  (currently inconsistent with npm-based workflow, harmless because
  package-lock.json takes precedence on Vercel).
- **Sprint C:** Future-release tracker module (BL-GRP "Watch List"
  integration).
- **Sprint D:** Statistics dashboard (recharts likely needs re-adding,
  was removed in B-0 as unused).
- **Future:** deeper BL-GRP doc-sync — auto-pull phase structure from
  BL-GRP docs into the Supabase catalog (manual for now).

## Cross-Project Note

The Infinity Archive consumes data curated in the BL-GRP project (in
Claude.ai). The BL-GRP phase files (`BL-GRP-NN-*.docx`) are the source
of truth for the reading list. When phase files change in ways that
affect the app's data shape (new books, restructured phases, new
factions), update the Supabase catalog (`public.phases` + `public.books`
tables) — the single source of truth for the app render since Sprint E.
This sync is manual for now.

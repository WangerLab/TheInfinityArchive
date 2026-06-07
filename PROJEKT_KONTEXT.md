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

**Sprint B-3c — full BL-GRP metadata seed into Supabase (COMPLETE)**

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
| Backend     | Supabase active: auth + user_progress (lifecycle status, B-3a) + books with 22 metadata cols (B-3b) seeded full 349-row catalog (B-3c) | — |
| Hosting     | Vercel, live, auto-deploys main              | Unchanged                         |

## Data Structure

Reading list lives in `frontend/public/data/project_data.json`. Static
JSON, drives the entire app render. 8 phases (id 0-7), each with
`books[]`. Books are either single novels
(`{title, author, pages, type, tags}`) or omnibuses with nested
`contents[]` for sub-items.

Supabase `public.books` now holds the full master catalog: 349 rows
(176 entries + 173 sub-items) seeded from `BLGRPMasterMetadatav2.csv`
in Sprint B-3c, with all 22 BL-GRP metadata columns populated (pub_year,
location, protagonist, key_characters, faction, mood_tags, semantic_tags,
spoiler_free_summary, etc.). The stable join-key is `entry_id`
(e.g. `P0-01`, `P6-32.5`); sub-items link to parents via `parent_book_id`.

**Frontend↔DB divergence (intentional, known — not a bug):** the frontend
still renders the catalog from the static `frontend/public/data/project_data.json`
(the older 161-row structure), while the DB now carries the richer 349-row
truth. Per-book progress reads/writes already go through Supabase
(`user_progress`, since B-2). Switching the catalog render from JSON to the
seeded Supabase tables is a later sprint (E). Until then: DB = rich truth,
frontend = legacy JSON. Do not mistake this gap for a regression.

Per-book user progress is persisted in Supabase `public.user_progress`,
read and written via the `useSupabaseProgress` hook. The hook
reconstructs a title-keyed in-memory object (the same shape the old
localStorage layer used, so the rest of App is unchanged) from the
relational rows, and writes back via debounced diff-based upsert keyed
on `(user_id, book_id)`. Sub-items resolve to their own `book_id` via
the globally-unique title; the hook skips writing phantom parent rows
for omnibus containers that have no progress of their own. The
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
- **Sprint E:** BL-GRP-data-sync exploration — pull phase structure
  from BL-GRP project docs rather than hard-coded JSON.

## Cross-Project Note

The Infinity Archive consumes data curated in the BL-GRP project (in
Claude.ai). The BL-GRP phase files (`BL-GRP-NN-*.docx`) are the source
of truth for the reading list. When phase files change in ways that
affect the app's data shape (new books, restructured phases, new
factions), update both `frontend/public/data/project_data.json` AND
the Supabase seed (`public.phases` + `public.books` tables). This sync
is manual for now — Sprint E may automate it.

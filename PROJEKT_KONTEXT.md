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

**Sprint B-2 — localStorage → Supabase data layer (COMPLETE)**

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
| Backend     | Supabase active (auth + user_progress reads/writes) | —                          |
| Hosting     | Vercel, live, auto-deploys main              | Unchanged                         |

## Data Structure

Reading list lives in `frontend/public/data/project_data.json`. Static
JSON, drives the entire app render. 8 phases (id 0-7), each with
`books[]`. Books are either single novels
(`{title, author, pages, type, tags}`) or omnibuses with nested
`contents[]` for sub-items.

The same catalog is now also seeded in Supabase (`public.phases` and
`public.books` tables, 8 phases + 161 books = 79 top-level + 82 omnibus
sub-items). The frontend reads per-book progress from Supabase (B-2);
the catalog (phases/books) still renders from the static JSON, not yet
from the seeded Supabase tables — that's a later sprint (E).

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

Supabase progress schema (active since B-2):
`public.user_progress` table with `user_id` (FK auth.users), `book_id`
(FK books.id), `is_read`, `rating` (1-5), `notes`, `completed_at`,
`updated_at`. RLS enforces `auth.uid() = user_id` for all writes and
reads.

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

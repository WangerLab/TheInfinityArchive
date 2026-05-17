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

**Sprint B-1 — Supabase Client + Magic Link Auth** (in progress)

Wire the Supabase JS client into the frontend, add Magic-Link
authentication, gate the catalog behind a logged-in state. The
localStorage persistence layer remains untouched in B-1 — B-2 will
replace it with a Supabase-backed data layer.

Structured into sub-commits:
- B-0.5: Doc update (CLAUDE.md + PROJEKT_KONTEXT.md to post-B-0 state) ← current
- B-1a: @supabase/supabase-js dependency + `lib/supabase.js` singleton + `.env.example`
- B-1b: AuthGate component + App.js wrap + logout button in GlobalHeader

## Tech Stack — Current State

| Layer       | Current state                                | Target (Sprint B-2+)              |
|-------------|----------------------------------------------|-----------------------------------|
| Frontend    | React 19, Tailwind, plain react-scripts      | Unchanged                         |
| Build       | CRA-native, `baseUrl: "src"`, bare imports   | Unchanged                         |
| Dependencies| 12 (cleaned in B-0, down from 52)            | +1 (@supabase/supabase-js in B-1a)|
| State       | localStorage only                            | Supabase only (B-2, full replace) |
| Auth        | None                                         | Supabase Magic Link (B-1b)        |
| Backend     | Supabase provisioned, not yet read from app  | Active backend (B-1b/B-2)         |
| Hosting     | Vercel, live, auto-deploys main              | Unchanged                         |

## Data Structure

Reading list lives in `frontend/public/data/project_data.json`. Static
JSON, drives the entire app render. 8 phases (id 0-7), each with
`books[]`. Books are either single novels
(`{title, author, pages, type, tags}`) or omnibuses with nested
`contents[]` for sub-items.

The same catalog is now also seeded in Supabase (`public.phases` and
`public.books` tables, 8 phases + 161 books = 79 top-level + 82 omnibus
sub-items). The frontend does NOT yet read from Supabase — that's B-2.

Per-book user progress is stored in localStorage under key
`infinity-archive-v3`, shape:

```json
{
  "Book Title": {
    "isRead": true,
    "rating": 4,
    "notes": "...",
    "contents": {
      "Sub-Book Title": { "isRead": true, "rating": 5, "notes": "..." }
    }
  }
}
```

Backward-compatible with old boolean format for sub-items via
`isSubItemRead()` helper in App.js.

Supabase target schema (already provisioned, will be read from in B-2):
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

- **Sprint B-2:** localStorage → Supabase data layer swap. Replace
  `useLocalStorage` hook with `useSupabaseProgress`. Delete
  `useLocalStorage.js`. Hard-cut, no offline cache.
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

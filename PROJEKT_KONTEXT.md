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

**Sprint A — Emergent Exorcism** (in progress)

Cleanup of the Emergent.sh-generated boilerplate from the original
scaffold. Three commits:
- A-1: Remove backend/, tests/, test_reports/, test_result.md, .gitconfig ✓
- A-2: Remove frontend/plugins/, craco.config.js; clean index.html
  telemetry; switch package.json scripts to react-scripts ✓
- A-3: Remove .emergent/, memory/; rewrite README.md and .gitignore;
  create CLAUDE.md and PROJEKT_KONTEXT.md (this file) ← current

Branch: `claude/cleanup-remove-backend-XSXqj`. PR merge to main after
A-3 commit lands.

## Tech Stack — Current vs Target

| Layer    | Current state              | Target (Sprint B+)        |
|----------|----------------------------|---------------------------|
| Frontend | React 19, Tailwind, CRA    | Unchanged                 |
| State    | localStorage only          | Supabase + localStorage   |
| Backend  | None                       | Supabase (Auth + Postgres)|
| Hosting  | None (local only)          | Vercel, frontend/ as root |
| Auth     | None                       | Supabase Auth             |

## Data Structure

Reading list lives in `frontend/public/data/project_data.json`. Static
JSON for now. 8 phases (id 0-7), each with `books[]`. Books are either
single novels (`{title, author, pages, type, tags}`) or omnibuses with
nested `contents[]` for sub-items.

Per-book user progress stored in localStorage under key
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

## External Services

| Service  | Status        | ID / URL  |
|----------|---------------|-----------|
| GitHub   | Active        | WangerLab/TheInfinityArchive |
| Supabase | Not yet setup | — (Sprint B) |
| Vercel   | Not yet setup | — (Sprint B) |

## Next Sprints (planned, not committed)

- **Sprint B:** Supabase project setup, Auth wiring, schema for book
  progress, migration from localStorage. Vercel deployment.
- **Sprint C:** Future-release tracker module (BL-GRP "Watch List"
  integration — books announced but not yet published).
- **Sprint D:** Statistics dashboard (Phase 7 work).
- **Sprint E:** BL-GRP-data-sync exploration — pull phase structure
  from BL-GRP project docs rather than hard-coded JSON.

## Cross-Project Note

The Infinity Archive consumes data curated in the BL-GRP project (in
Claude.ai). The BL-GRP phase files (`BL-GRP-NN-*.docx`) are the source
of truth for the reading list. When phase files change in ways that
affect the app's data shape (new books, restructured phases, new
factions), update `frontend/public/data/project_data.json`
accordingly. This sync is manual for now — Sprint E may automate it.

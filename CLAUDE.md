# CLAUDE.md

Code conventions, commit rules, and lessons learned for The Infinity
Archive. Read this before making changes.

## Tech Stack

- **Frontend:** React 19 + Tailwind CSS, plain `react-scripts` (no CRACO)
- **UI primitives:** shadcn/ui + lucide-react + Framer Motion
- **State:** React hooks + Supabase (`useSupabaseProgress`), per-book
  progress in `public.user_progress`. localStorage removed in B-2c.
- **Backend:** Supabase (provisioned Sprint B-0, wired Sprint B-1+)
- **Build:** `cd frontend && npm start` (dev), `npm run build` (prod)
- **Hosting:** Vercel with `frontend/` as Root Directory
- **Package manager:** npm (package-lock.json is authoritative)

## Code Conventions

- Functional React components only. No class components.
- File naming: `PascalCase.jsx` for components, `camelCase.js` for hooks/utils.
- Imports: bare absolute paths from `src/` (e.g. `import { Button } from "components/ui/button"`).
  Configured via `jsconfig.json` with `baseUrl: "src"`. Do NOT reintroduce
  the `@/` alias — it requires CRACO or similar tooling which was removed
  in Sprint A.
- Tailwind utility-first. Custom CSS only in `index.css` and `App.css`
  for Grimdark base styles (scanlines, glows, font-display).
- No inline styles unless dynamically computed.

## Grimdark Aesthetic — Non-Negotiable

The visual identity is core to this app and survives every refactor:

- **Background:** `slate-950` true black, OLED-friendly
- **Primary accent:** `amber-500` (gold), used for active states and headers
- **Secondary accents:** plasma (cyan), auspex (green)
- **Fonts:** Orbitron for display/headers, system fonts for body
- **Effects:** Noise textures, scanline overlay, double borders with glows
- **Custom components:** GrimdarkCheckbox, SkullRating, MechanicalSwitch,
  PhaseCard, SectorCard — these encode the visual language, treat them
  as design tokens

## Commit Discipline

- One commit = one logical change. Never bundle features or bugfixes.
- Soft limits: ~50 lines per edit-commit, ~150 lines for new files.
  Migrations may be larger. Semantic cohesion may override, but only
  with explicit justification in the commit body.
- Conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `style:`, `perf:`, `test:`.
- Body explains *why*, not *what* (the diff shows what).

## Two-Claude Workflow

This app is developed via a two-Claude model:

- **Claude in chat** (Opus) = architect, analyst, prompt engineer.
  Plans sprints, writes prompts for Claude Code. Does NOT write direct
  code changes.
- **Claude Code** (Sonnet, on Tim's device) = executor. Runs the
  prompts, shows full file contents for review, commits on Tim's go.

Tim pushes himself, always. Claude Code stops and waits before push.

## Device Mode — Per Session

- **Desktop:** local filesystem, `git diff` review allowed, push directly
  to main after approval.
- **Mobile:** push only via `claude/*`-branch, merge via GitHub MCP or
  Web UI. No `git push origin HEAD:main` (HTTP 403 from the Anthropic
  harness). Full file contents replace `git diff` for review (hard to
  read git diff on phone). Repo setting "Automatically delete head
  branches" is ENABLED — server-side cleanup after every squash-merge,
  no manual branch deletion needed.

## Mobile Release Sequence

After Tim's go-signal at sprint-commit completion, Claude Code executes
in one shot:

````
git push -u origin claude/<sprint-id>
# Then via GitHub MCP:
#   create_pull_request (with exact title and body)
#   merge_pull_request (squash, with exact title and body)
# GitHub auto-deletes the head branch.
git checkout main
git pull origin main
git branch -D claude/<sprint-id>   # local cleanup
git log -1 --oneline                # verify squash commit on main
````

Tim verifies via screenshot, does not manually navigate the GitHub
Web UI.

## Mandatory Build Smoke Test

Every commit that modifies `frontend/` (package.json, dependencies,
jsconfig, tailwind config, src/, public/) MUST end with `npm run build`
before the commit is finalized. Non-negotiable after the Sprint A → B-0
lesson where CRACO removal silently broke alias resolution.

Doc-only commits (no `frontend/` changes) are exempt.

## Lessons Learned

### Sprint A → B-0: Latent build regression

Sprint A removed CRACO without replacing its alias-resolution role.
Sprint A's acceptance criteria explicitly skipped a build smoke test
because "the sprint goal isn't build-related" — so the breakage went
uncaught until B-0's first Vercel deploy failed.

**Lesson:** every sprint that touches build tooling or config (even
indirectly — removing CRACO is config) ends with a mandatory
`npm run build` smoke test, even when the sprint goal isn't
build-related.

### Sprint B-0: Sed-pattern coverage in codebase rewrites

When B-0 rewrote `@/` alias imports to bare absolute imports, the sed
pattern matched only `from "@/...` and missed the side-effect import
`import "@/index.css"` (no `from` keyword) in `src/index.js`. Claude Code
caught it independently during smoke-test verification.

**Lesson:** when prescribing batch rewrites, the match pattern must
cover all syntactic forms of the construct — side-effect imports
(`import "foo"`), type-only imports, re-exports (`export ... from`),
and dynamic `import()` calls. Verify with a broader grep proving zero
occurrences of the construct remain, not just zero matches-of-the-
narrow-pattern.

### Sprint B-0: GitHub auto-delete-branches setting

Mobile-mode pushes via the Anthropic harness cannot run
`git push --delete` (HTTP 403). The GitHub MCP `merge_pull_request` tool
also does not expose a delete-branch flag. Resolved at end of B-0 by
enabling the GitHub repo setting "Automatically delete head branches"
— server-side cleanup eliminates the entire problem class for all
future sprint commits.

**Lesson:** the auto-delete-head-branches setting is the canonical
solution for mobile-mode workflow. Do not attempt manual branch
deletion in mobile-mode prompts.

### Sprint B-0: PR pages are an integration audit point

During B-0's PR review, a Netlify bot was observed commenting deploy
previews on the open PR — revealing a legacy Netlify integration still
deploying in parallel to Vercel (with no Supabase env vars, so
functionally broken). Resolved by deleting the Netlify site.

**Lesson:** post-merge PR pages reveal external services connected to
the repo. Bots commenting on PRs are a useful audit signal.

### Sprint B-1: Build smoke test verifies compilability, not runtime correctness

The mandatory `npm run build` smoke test (Lesson 1) catches compilation
errors, missing imports, type problems, and Tailwind config issues. It
does NOT catch runtime bugs in code that makes network calls, handles
URL-hash redirects, manages auth state machines, or otherwise only
exercises its real behavior once the bundle is loaded in a browser.

Sprint B-1b's commit-Go was given on green-build alone, before any local
end-to-end test. The Vercel deploy happened to work — but a redirect-URL
typo, a missing Supabase auth config option, or a subtle state-machine
bug in AuthGate would all have shipped silently to production.

**Lesson:** for runtime-critical commits (auth flows, external API
integration, redirects, complex state machines, side-effect-heavy hooks),
build success is necessary but not sufficient. Sprint prompts must
explicitly request runtime evidence ("did you run it locally; what did
you see") before commit-Go, and Tim must run the test before giving the
Go signal. This is in addition to, not a replacement for, the build
smoke test.

### Sprint B-2: Auth-dependent hooks must render under the AuthGate subtree

B-2 swapped the progress layer to `useSupabaseProgress`, which calls
`supabase.auth.getUser()` on mount. The naive swap wired the hook into
`App()`, but `App()` also rendered `<AuthGate>` inside its own JSX.
React hooks run during the component's render, BEFORE the JSX (and thus
AuthGate) is evaluated — so the hook fired its auth call on every render,
including the unauthenticated one, threw `AuthSessionMissingError`, and
the app's error guard swallowed the login screen entirely. Build was
green; this only surfaced in the local runtime test (confirming the
Sprint B-1 lesson).

The fix was a behavior-neutral refactor (B-2b-1): extract everything
data- and progress-related into an `ArchiveApp` child, leaving `App()`
as a thin `<AuthGate><ArchiveApp /></AuthGate>` wrapper. The hook now
lives in `ArchiveApp`, which only renders once AuthGate confirms a
session.

**Lesson:** a hook that depends on auth state (or any precondition
enforced by a gate component) must live in a component rendered as a
CHILD of that gate, never in the component that renders the gate in its
own JSX. The gate cannot protect a hook that sits at the same level as
the gate's own JSX. When swapping in such a hook, check the render
hierarchy first; if the gate is inside the same component, extract a
child first (separate, behavior-neutral commit) before wiring the hook.

### Sprint B-3c: Large data seeds — apostrophes, ON CONFLICT arbiter, NOT NULL, file routing

Seeding the 349-row master CSV into `books` surfaced five distinct traps,
each caught only because intermediate output was inspected before applying:

1. **Apostrophes in text[] array literals must be SQL-escaped.** Building
   a Postgres array literal as `'{"...","..."}'` and then NOT doubling the
   single-quotes inside the data silently *drops* apostrophes when the
   value hits the DB (`C'tan` → `Ctan`, `El'Jonson` → `ElJonson`). Fix:
   build the `{...}` literal, then `.replace("'", "''")` over the whole
   literal before wrapping in `'...'`.

2. **`ON CONFLICT (col)` needs a FULL unique constraint, not a partial
   index.** A partial unique index (`... WHERE entry_id IS NOT NULL`) does
   NOT satisfy `ON CONFLICT (entry_id)` unless the conflict clause repeats
   the exact WHERE predicate. For an upsert arbiter, use a plain
   `ADD CONSTRAINT ... UNIQUE (col)` (multiple NULLs are still allowed —
   SQL treats NULLs as distinct).

3. **`books.sort_order` is NOT NULL; CSV `position` is empty for 122 rows.**
   Don't invent values. Derive deterministically from `entry_id`
   (`Pn-MAJOR[.MINOR]` → `MAJOR*100 + MINOR`) when `position` is empty;
   collision-free within phase. Verified-source value wins when present.

4. **`books_parent_book_id_fkey` is ON DELETE CASCADE.** Deleting a parent
   removes its children. Useful for legacy cleanup (legacy→legacy links go
   together), but guard the delete: confirm no *seeded* row has a legacy
   parent before issuing it, or the cascade could reach live data.

5. **Don't route large seed files through the model context.** A 274 KB
   SQL file cannot be read reliably (256 KB limit) and re-emitting it via
   a tool parameter risks corrupting escaped apostrophes / array literals.
   Apply large seeds via the Supabase SQL Editor (paste; split into atomic
   halves if it exceeds the editor's single-statement limit) or local
   `psql -f`. The MCP connector is for verification and small/guarded
   migrations, not for bulk data transfer.

**Cross-source lesson — title joins drift.** The B-2 catalog (from
`project_data.json`) and the master CSV diverged on 44 of 161 rows across
naming, omnibus structure, AND phase assignment. A title join silently
leaves a third of the catalog unenriched. The fix was to add `entry_id`
as a stable join-key (overriding the B-3b §5 "don't store it" decision —
documented in the B-3c-1 migration). For any future CSV re-sync (Sprint E)
or Curator-Mode write, join on `entry_id`, never on title.

**Verification lesson — count both sub-item variants.** `row_type` has two
sub-item values: `sub_item` (133) and `sub_item_optional` (40). Counting
only `'sub_item'` undercounts by 40. Use
`row_type IN ('sub_item','sub_item_optional')`.

**Workflow note — migration file placement.** Twice in B-3c the delivered
.sql landed in the `db/` root instead of `db/migrations/`. Add an explicit
path check (`test -f db/migrations/<file>`) at the start of any migration-
commit prompt before `git add`.

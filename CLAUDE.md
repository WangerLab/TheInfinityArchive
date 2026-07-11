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

### Sprint E: Title-keyed frontend state breaks on non-unique titles

The frontend keyed all progress state by book title (bookProgress[title],
contents[subItemTitle]) — fine for the 161-row JSON catalog, where titles
happened to be unique. The 349-row DB catalog has non-unique titles across
phases ('Apocalypse' P3-30 & P5-13, 'Leviathan' P3-13.5 & P5-31). Rendering
the DB catalog under title-keying would collapse two distinct books onto one
state key — toggling one marks the other.

**Lesson:** never key client state by a human-facing string that isn't
guaranteed unique. Use entry_id — already the DB join-key since B-3c, complete
and unique across all 349 rows incl. sub-items. The fix (E-2a/E-2b) moved the
in-memory progress key and all handler arguments from title to entry_id;
user_progress still stores book_id (UUID) — only the in-memory indexing
changed. JSX keys and displayed titles stay on title (display-only, unique
among siblings). Verified live: marking 'Apocalypse' P3 left 'Apocalypse' P5
untouched (two distinct user_progress rows).

### Sprint E.1: Verify the render chain before a UI commit

Enrichment-rendering JSX was written into `BookEntry.jsx` on the assumption it
was the component the phase view renders book rows with. It isn't — `PhaseDetail`
renders via `RecursiveBookEntry`. `BookEntry.jsx` is not on the phase-view render
path at all, so the code compiled clean and rendered nothing. The mistake cost a
correction commit (aa799ac) plus a revert (79a9d44) to remove the dead code.

**Lesson:** before writing UI into a component, confirm it is actually on the
render path — `grep` the component name in the view/container files (here:
`PhaseDetail.jsx`, `App.js`) and follow the chain from the screen down. Never
pick the target component by name similarity ("BookEntry sounds like the book
row"). A green `npm run build` does not prove a component renders — only that it
compiles. This is the render-path corollary to the Sprint E build-green !=
runtime-green lesson.

### Sprint F: M:N series model, and why a flat column would have lied

Series data looked 1:1 on entry_id (no work maps to two different series names),
which tempts a flat books.series column. Two structural facts made that wrong:
(1) omnibus parents AND their children each carry the series, with level-specific
non-numeric ordering (omnibus / #1 / short-prequel / standalone) that a single
column cannot order sanely; (2) the also_in cross-phase duplicate 'Apocalypse'
(P3-30 & P5-13) is one work listed as two book rows, both legitimately #5 of
Space Marine Conquests — genuine work-level M:N. The dedicated book_series
junction represents both cleanly.

**Data-hygiene lessons carried forward:** the source CSV spells the same series
two ways (Twice-Dead King / The Twice Dead King; Jarnhamar Pack / Space Wolves:
Jarnhamar). Canonicalise BEFORE seeding the parent table, and map alias
spellings onto the canonical id in the junction seed. Always dry-run a bulk seed
as a LEFT JOIN count first (input_rows == book_join_hits == series_join_hits)
before the real INSERT — it catches a single mistyped entry_id or series name
that would otherwise be silently dropped. Apostrophes (Gaunt's Ghosts) still
need '' escaping in every VALUES literal (B-3c §1).

### Sprint F.1: faction_primary sits at every level, unlike pure enrichment fields

Building the grand-alliance filter, the working assumption was that
faction_primary follows the omnibus-enrichment rule (parent rows empty,
data lives on children — true for location/date/protagonist/summary). A
live column-population query disproved it: faction_primary is populated on
169/176 entry rows AND 132/133 sub_items — it sits broadly at every level,
not just on children. Had we trusted the enrichment-rule generalisation,
the per-row filter would have treated most omnibus parents as unmatchable.

**Lesson:** the "omnibus parents are empty for enrichment fields" rule is
per-field, not universal. Before building logic that depends on which
levels a column is populated at, query it directly
(count(*) FILTER (WHERE col IS NOT NULL) GROUP BY row_type) rather than
generalising from other fields' fill patterns.

**grand_alliance data path (F.1):** a curated CASE mapping collapses the 47
distinct faction_primary values to 4 alliances (imperium/chaos/xenos/
unaligned), stored as a NOT NULL, CHECK-constrained books.grand_alliance
column (migration FX-1_books_grand_alliance.sql), threaded through
useCatalog onto both entry and child shapes, and applied as a per-row
filter in PhaseDetail BEFORE the map (Rule A: parents match on their own
alliance; children are not individually inspected). Phase stats
deliberately keep using the full unfiltered list so progress reflects the
true catalog. The filter buttons' ids (imperium/chaos/xenos) already
matched grand_alliance values from the original dead strategic-filter UI —
only 'unaligned' was added. Imperium is 239/349 rows (68%), so that button
filters little by design; the filter's real use is isolating chaos/xenos/
unaligned.

**Deferred cleanup (not F.1 scope):** the activeFilters prop is still
passed to RecursiveBookEntry but now unused (filtering moved up to
PhaseDetail); and PhaseDetail still uses key={book.title} (fragile —
titles are non-unique across phases, should be book.entryId).

### Sprint G: normalise the shared-vocabulary field, leave the singleton field an array

Sprint G built the tags/book_tags M:N structure but scoped it to mood_tags
ONLY. The two array fields on books looked like one job (Schema §5.5 lumped
mood_tags, semantic_tags, and legacy tags[] together) but measuring them first
proved they are different animals: mood_tags = 249 distinct, 55 shared >=5x — a
real shared vocabulary that a filter can group on (avg 3.8/book). semantic_tags
= 2004 distinct, 1470 (73%) singletons — a dense per-book description layer
whose consumer is the AI companion (which reads it as a context blob, not a
join), avg 12.6/book. Legacy tags[] is effectively dead (2 of 176 entries).

**Lesson:** normalise the field with a shared, repeated vocabulary; leave the
singleton-heavy per-book field as an array until its actual consumer exists and
dictates the shape. Building a junction for semantic_tags now would be work with
no abnehmer — the same anti-pattern the F "build only what has an Abnehmer" rule
guards against. Corollary: always MEASURE the distinct-count and singleton-ratio
of an array field before deciding to normalise it; a spec written before the
data was measured (here §5.5) can be wrong about scope.

**mood tag data path (G):** tags (id, name, type — type CHECK ('mood') only,
UNIQUE(name,type)) + book_tags (book_id, tag_id, PK, both FKs ON DELETE
CASCADE, index on tag_id), RLS read-only for authenticated. Seeded directly
from books.mood_tags[] via unnest (no hand-typed VALUES — deckungsgleich with
the live MCP-applied state). Dry-run before the junction insert (F-Lektion):
expected_pairs == book_join_hits == tag_join_hits == 1131, real insert 1131.
Final: 249 tags / 1131 links / 298 books. 3 DB-only commits (63d1019 tables+RLS,
40ab391 seed values, 2d40e9a seed junction). NOTE: moodTags was already in the
useCatalog shape since E.1 (from the array), so the junction changed nothing
visible — its value is queryability/filtering, unbuilt as of G (mood-filter UI
deferred pending the interface rework).

### Interface/Navigation Rework: view-shell + data-provider pattern

The app moved from one hardcoded screen (Phase list = whole app) to a multi-view
shell. Architecture, top down:

    App
    └── BrowserRouter          (routing is orthogonal to auth — OUTSIDE AuthGate)
        └── AuthGate
            └── ArchiveDataProvider   (src/context/ArchiveDataContext.jsx)
                └── Routes            (pages under src/pages/)

ArchiveDataProvider holds the whole data layer — useCatalog + useSupabaseProgress,
globalStats, getPhaseStats, the six progress handlers, the loading/error screens —
exposed via useArchiveData(). Every view consumes ONE fetch through this context
instead of loading its own. The Black-Screen lesson now generalises: the provider
(which calls the auth-dependent hooks) must sit as a CHILD of AuthGate, so
getUser() never fires before auth is confirmed. Router outside AuthGate, data
provider inside it. View-state stays local to each page (expandedPhase,
activeFilters live in PhaseView, not the provider) — the provider is for shared
DATA, not per-view UI state. react-router-dom is v7, used with the classic
declarative API (BrowserRouter / Routes / Route element=…); no data-router/loaders
by design.

### Workflow change (2026-07-02): commit+push in one, live-test on Vercel

Tim's standing preference from this session: every commit prompt commits AND
pushes in one go (Desktop), then Tim live-tests on the Vercel deployment — he does
NOT test locally. This SUPERSEDES the older "Claude Code stops and waits for go
before push" rule for Tim's sessions. Keep the build check IN the prompt (npm run
build before commit; broken build → no commit/push); Tim's live test catches
runtime issues; forward-fix if something breaks (Vercel Instant Rollback + git
revert are the nets). Vercel-live is the better runtime check for a single-user
app anyway (real env vars, auth redirect URLs, real build).

### Interface/Navigation Rework — visible block: layout route + Outlet for nav

The visible nav block (C1-C3) closed the shell rework, skeleton-first, three atomic
commits. Order matters: vercel.json SPA rewrite FIRST (75cba88) — deep-links and
hard-refresh on client routes 404 on Vercel without it, so it must land before any
real route beyond the catch-all. Then real routes (56364ac): / -> Landing hub,
/phases -> PhaseView, catch-all -> <Navigate to="/" replace/>. Then a persistent
nav via a react-router v7 layout route (2591cda):

    <Route element={<AppLayout/>}>      (AppLayout = <AppNav/> + <Outlet/>)
      <Route path="/phases" .../>
    </Route>

Nav lives on the layout route, so it renders on app views but NOT on the Landing —
Landing sits OUTSIDE the layout route, a clean nav-free hub. Further views attach to
the same layout route. NavLink needs `end` on the "/" link or it stays active on
every nested path. The nav strip is non-sticky to avoid a z-index clash with the
still-untouched sticky GlobalHeader; the nav<->header visual relationship is a
skinning decision, deferred. Skeleton-first paid off: routing, redirect, deep-link
survival and nav were all verified live before any optics.

### Sprint Archive View: reuse the recursive row, key cross-phase lists by entryId, chips from data

The Archive view (catalog-wide browse, second view under AppLayout) was built with
NO new row UI: it flat-maps every phase's books into one list and feeds each to the
EXISTING RecursiveBookEntry, wired to the same ArchiveDataProvider context and
progress handlers PhaseDetail uses. A whole view came for free because the row
component was already self-contained and context-driven. Confirmed the reuse would
work by reading the component's props and render path FIRST (E.1 corollary), not by
assuming from its name.

Three points worth carrying:

1. **Cross-phase flat lists MUST key by entryId, never title.** Archive is the first
   place a cross-phase list is actually rendered; titles are non-unique ('Apocalypse'
   P3 & P5), so key={book.title} would collapse the two into one element. Done right
   from the start here (key={book.entryId}) rather than repeating PhaseDetail's
   still-open key={book.title}. Render-side twin of the Sprint E state-keying lesson.

2. **Additive filter placement beats mid-skeleton relocate.** Archive got its own
   allegiance filter (config mirrored from GlobalHeader for semantic identity) rather
   than ripping the bar out of the header. Emptying the header would touch the
   deferred-skin component and change Phase-view behavior during a skeleton pass —
   more breakage surface for no skeleton-phase benefit. Build additively; fold the
   header cleanup into the pass that reworks the header anyway.

3. **Data-driven filter chips, not a hardcoded list.** The mood chips are computed
   from the catalog (count each mood over entry-level books, keep those >= 8 hits,
   sort desc) — so the control reflects the actual shared vocabulary, and the
   threshold drops the long singleton tail (that belongs to the AI-companion context
   blob per the Sprint G split, not to a filter). Contrast the 4 allegiance buttons,
   legitimately hardcoded (a closed 4-value domain). Memoise the derived arrays
   (allBooks/moodChips/visibleBooks): allBooks as a fresh flatMap each render would
   otherwise defeat the downstream memos.

### Sprint Landing Bridge: img-as-sizer stage, calibration harness, asset-tracking

The Landing was rebuilt as a command-bridge over a painted backdrop. Three
patterns worth carrying:

1. **img-as-sizer stage for art-anchored overlays.** A backdrop `<img>` with
   `w-full h-auto` inside a centred max-width stage (`data-bridge-stage`) sizes
   the stage itself; every zone is an absolute `%`-overlay resolving against
   that box, so overlays scale WITH the art and never drift off their painted
   feature on resize. Chosen over `object-cover` (crops → destroys the
   %-mapping) and over a hardcoded aspect-ratio (guesswork). This is the pattern
   for any layout that pins UI onto features of a background image. An earlier
   CSS-grid layout was built first and then retired once the real backdrop
   landed — grid is the wrong model the moment the art is the stage.

2. **Calibration harness beats editor math.** To pin an overlay onto a painted
   feature (here the black cogitator screen), do NOT compute pixel coordinates
   in the editor. Ship a temporary drag/resize harness that reads live
   top/left/width/height as % of the stage; dial it in the real browser against
   the actual Vercel deploy, read four numbers, bake them as constants, remove
   the harness. Browser-against-real-render accounts for the actual rendered
   stage (crop, max-width, scaling) that editor math cannot. Make the harness
   loud (fuchsia) so it can never ship silently, and verify removal with
   `git grep CalibrationHarness` / `git grep fuchsia` before the bake commit.
   Cogitator screen baked at top 57.4% / left 38.4% / w 23.1% / h 27.4%.

3. **On-disk is not in-repo; commit the asset with its consumer.** `test -f`
   passing means the file exists in the working tree, NOT that git tracks it —
   a fresh-clone Vercel build only sees committed files. Any commit whose code
   references a new asset MUST commit that asset (in its own prior commit for
   atomicity). Verify "in repo" with `git ls-files --error-unmatch <path>`, not
   `test -f`. Corollary: do NOT bundle assets that have no code consumer yet —
   the five station PNGs stayed deliberately untracked until the code that
   renders them lands (the F "build only what has an Abnehmer" rule, applied to
   assets). Caught in this sprint only because Claude Code inspected `git status`
   before staging; the S1 prompt's `test -f` existence check was insufficient to
   prove tracking.

### Sprint Landing Bridge step 5: aspect↔width coupling, live-zone text stays code, art retires the frame pass

Positioning the five stations and swapping in real artwork. Three lessons:

1. **aspect-[] couples height to width — change one, re-check the other.** The
   oculus box was moved to a portrait 4:5 image but kept width 22 (calibrated
   for the old flat 3:2 art). At 4:5, height = width × 5/4, so the box grew tall
   enough to overlap the cogitator screen — build green, runtime broken. An
   aspect-ratio change and the width that feeds it must be reasoned together;
   the box height is derived, not independent. Fixed by returning oculus to
   aspect-[3/2] like the four corners once a 16:9 image was available.

2. **A live-zone label must never be baked into the asset.** The oculus
   "SEGMENTUM SOLAR" caption is a step-6 live value (it changes with the current
   book's segmentum). An early generated image had the text burned in — which
   would have frozen it. The rule: any text destined to become live data stays a
   CSS overlay over a text-free image, marked with a data-attribute
   (data-oculus-segmentum) as the step-6 dock point — exactly mirroring the
   cogitator screen's placeholder pattern. Generate art text-free; the code
   supplies the label.

3. **Rich per-item artwork retires a planned frame-differentiation pass.** Step 5
   originally planned a C4 "warm/cool frame treatment" (gold framing vs
   plasma/auspex glow per box). Once real art JPEGs filled the boxes, they
   already carried the colour identity in-image (auspex green, oculus/campaign
   blue, strategium/record warm-gold). A coloured CSS frame would compete with
   the art rather than support it, and would use the retired v1.3 neon tokens.
   C4 was deliberately dropped; frame treatment (if any) folds into the app-wide
   skin pass, decided coherently in the v1.3 register. Lesson: when generated
   assets already encode a distinction, a CSS mechanism planned to create that
   distinction becomes redundant — reassess planned skin steps after art lands.

### Sprint Book-Detail: ternary status, entry-level dossier, one-book invariant, hooks-order

The Book-Detail sprint turned the binary progress layer into a ternary state
machine and added the dossier + current-assignment feature. Points worth carrying:

1. **is_read is a GENERATED column — never write it.** user_progress.is_read is
   `GENERATED ALWAYS AS (status = 'read')`. The upsert payload writes `status`
   plus timestamps; writing is_read would be rejected by Postgres. Verified via
   information_schema before touching the hook. Generalises: before extending a
   write path, query information_schema.columns for generated/default columns —
   don't assume a column is writable because it's selectable.

2. **started_at must survive the reading→read transition.** The value of the
   ternary status is that started_at is set once (first reading OR read) and
   preserved across later transitions, while completed_at is set only at read.
   buildPayload keeps a startedAtById map (parallel to completedAtById) and reuses
   the prior started_at rather than overwriting it. A direct unread→read checkbox
   click sets both timestamps ~identically; a dossier reading→read flow sets them
   seconds apart — the timestamp gap is the signature that distinguishes the two
   paths in the DB.

3. **reading is entry-level only; sub-items stay binary.** An omnibus is "being
   read" as a whole; individual shorts are just checked off. Not giving sub-items
   a third state kept the sub-item write path (the phantom-parent-guard, the
   binary hydration) completely untouched — smaller change surface on the
   auth-dependent hook, which is exactly where the B-2 black-screen class of bug
   lives. Match the state model to the mental model AND to the risk surface.

4. **A hook must never sit after a conditional early return (Rules of Hooks).**
   A sprint prompt placed `useState` after `if (!resolved) return (...)` in
   BookDetail — that makes the hook conditional and crashes when navigating from a
   valid book to an unknown entryId. Claude Code caught it and moved the useState
   above the early return; the plain-value derivations (otherReading, the resolver
   handlers) legitimately stay below it because they are not hooks. Lesson: all
   hooks go at the very top of the component, before any conditional return; only
   non-hook values/functions may follow a guard clause. Chat-authored prompts can
   get this wrong — the executor must check hook order independently.

5. **Enforce a single-value invariant in the app layer via one atomic write, not
   a DB constraint.** "Exactly one book reading" is enforced by handleStartReading,
   which sets the new book to reading AND the previous reading book to read/unread
   in the SAME setState updater — so two books are never reading mid-flight. No
   partial-unique-index gymnastics on the DB. A confirmation dialog (three
   resolutions: mark-old-read / reset-old-unread / cancel) makes the transition a
   deliberate choice, not a silent automation. Caveat: the invariant only holds
   because the dossier is the ONLY reading entry point; any second entry point
   (e.g. a cogitator quick-action) must repeat the "is another book reading" check.

6. **Router-free presentational components stay reusable across mounts.** BookRow
   and CurrentAssignment take an onOpen(entryId) callback instead of importing
   useNavigate, so the same component works in a list, in the phase header, and
   later on the Landing cogitator without knowing about routes. The caller supplies
   navigation. Costs one line at each call site, buys cross-context reuse.

### Sprint C: reflection capture — reuse the dead column, derive the marker

Sprint C added personal_take (distilled verdict) to user_progress and surfaced
reflection in the READ dossier. Points worth carrying:

1. **Reuse a wired-but-dead column before adding a parallel one.** user_progress
   already had a `notes` column, fully threaded through the hook (hydration,
   entryChanged, buildPayload) but never surfaced in any UI. Sprint C added ONE
   new column (personal_take) for the distilled verdict and reused `notes` as the
   loose marginalia field, rather than adding both personal_take AND free_notes.
   Same instinct as the G-series normalise-don't-duplicate lesson: a second
   identically-typed dead column next to an existing one is duplication. Before
   adding a field, grep the hook — the write path may already carry it.

2. **The context handler for it may already exist too.** handleBookNotesChange was
   already defined and exported in ArchiveDataContext, wired to nothing. Sprint C
   only added handleBookPersonalTakeChange; the notes handler needed zero work.
   Check the context exports before writing a "new" handler.

3. **Derive the PENDING marker, never store it.** isReflectionPending(entryId) is
   `status === 'read' && personal_take is empty`, computed in context from
   bookProgress — not a DB column, not a stored flag. Same principle as the is_read
   generated column: a marker that is derived can never diverge from its source. The
   badge clears reactively the instant a take is written, because the blur-commit
   updates bookProgress and the derivation re-runs. No manual clearing, no race.

4. **Inline free-text commits on blur, not on change.** The two dossier textareas
   hold local state (useState) and call the context handler onBlur, mirroring the
   NotesModal local-state pattern. One write per edit session, then the hook's own
   600ms debounce on top — not one write per keystroke. For inline (non-modal)
   fields, blur is the commit point; local state is seeded from bookProgress via a
   useEffect that lives ABOVE the early return (Rules of Hooks — the Book-Detail
   sprint's hook-order lesson applies to every new hook added to that component).

### Sprint Omnibus Sub-Items: a nested child becomes a first-class book

The sub-books inside an omnibus were deliberately binary checkboxes (Sprint C: "reflection/reading is entry-level, sub-item path byte-identical"). Tim wanted full parity: a read omnibus book should behave like any other book — its own ternary status, visible on Landing/Current Assignment, its own dossier, its own reflection. Achieved by flattening the data model, not by teaching consumers to nest. Eight commits, each live-verified, no commit broke the running app.

1. **"Is a book" is a data-model statement, not a UI one.** When a nested sub-element must become fully first-class, flatten the data model rather than making every consumer nesting-aware. Sub-item progress moved from bookProgress[parent].contents[sub] (nested) to bookProgress[sub] (flat) — the same shape as entry-level. parent_book_id in the DB stays the only place that knows membership. Every consumer got SIMPLER (currentReading/invariant lost their special case), not more complex.

2. **Bridge strategy (dual-write) for low-risk data-model moves.** A big-bang move would have broken every contents[sub] reader at once. Instead: commit 1 wrote sub-items flat ADDITIONALLY while keeping contents[sub] populated (both stores identical). Then consumers migrated off nested one at a time, each live-verified; the final commit tore the bridge down. Each step independently verifiable on Vercel.

3. **Readers-before-writers ordering prevents store drift.** During the migration, move the READERS to flat first (BookRow), then the WRITERS (BookDetail toggle). While any nested reader still lives, no flat writer may run — otherwise the two stores drift. Separating the two and doing them in this order was safer than collapsing them into one commit.

4. **Duplicated logic hides readers.** getPhaseStats looked like the last nested reader — but PhaseDetail carried a SECOND, locally duplicated phase statistic (calculateStats) that also read nested. Before any "last reader" teardown, grep the whole repo for the access pattern (.contents[...] on progress/bookProgress), never trust the one function you know about. → Centralise (one getEntryProgress/getPhaseStats) instead of duplicating.

5. **Strict pre-flight grep before destructive store teardown.** The teardown prompt carried a stop condition: if grep finds ANY nested reader/consumer, STOP. It fired (RecursiveBookEntry). Belt-and-braces on the auth-dependent hydration path.

6. **Dispose an orphaned consumer with its last reference points.** RecursiveBookEntry.jsx (510 lines, never imported/rendered since the BookRow refit) would have become incoherent zombie code once the handleSubItem* handlers were removed (it referenced handlers it would never receive). Deleted in the same commit rather than separately — semantic cohesion covers the scope.

7. **getEntryProgress covers single-book AND omnibus.** Single: flat own status, childRead/Total=0. Omnibus: ternary derived from flat sub-statuses (all children read → read; any child reading OR some-but-not-all read → reading/IN PROGRESS; else unread). Always call this helper, never re-derive in a view — BookRow is now purely presentational (receives entryProgress as a prop).

8. **resolveEntry contract: { book, phase, parent }.** Entry → parent:null. Sub-item → book = the sub-object, parent = the omnibus. hasContents (from book.contents) is false for a sub-item → it falls automatically into the single-book render path. Handlers get the right entryId automatically because book IS the sub-object; only the CONTENTS toggle deliberately references the parent (and runs only under hasContents).

### UI wiring: keep a shared header data-agnostic via a children slot

When a data-bound block (CurrentAssignment + description) must be pinned inside a
shared, sticky header, pass it as `children` rather than teaching the header its
data. GlobalHeader is rendered only in PhaseView but is deliberately kept router-
free and data-agnostic (built to be reused on the Landing cogitator later). A
`children` slot placed inside the sticky container — between the stats section and
the bottom accent — inherits the sticky position and full width, while the caller
retains data access and navigation. Props-through (giving the header currentReading
+ onOpen) would have been shorter at the call site but broken the decoupling. Also:
when a filter is removed and its host component is rendered in exactly one place,
delete the markup from the host, don't just stop passing the props — verified via
grep that GlobalHeader had no other render site before removing its ALLEGIANCE block.

### Sprint ViewBackdrop-Shell: one backdrop primitive, per-view accent, skeleton before skin

Introduced `components/ViewBackdrop.jsx` — a `position: fixed`, full-viewport station
photo rendered behind the view (content scrolls over it: "window into the room"). Props
are only `art` (a `/public` JPEG path) and `accent` (`'auspex' | 'plasma' | 'gold'`).
Blur and overlay are deliberately NOT props but fixed module constants
(`BACKDROP_BLUR = '2px'`, `OVERLAY_OPACITY = 0.3`) — the single tuning point, so no route
can drift out of the shared system. The fixed layer sits at `zIndex: -10`, `pointer-events:
none`; `.scanlines` (global, z 9997/9998) stays on top as intended.

Locked backdrop tokens (verified live): backdrop blur `2px`, overlay `hsl(var(--void) /
0.3)`, and `.grimdark-panel` made translucent — `card 0.6 / void 0.68` alpha fill plus
`backdrop-filter: blur(6px)`. Data legibility is carried by the panel's own translucent
fill, INDEPENDENT of the global overlay; that is why a light 30% overlay reads fine without
hurting readability. The opaque page root (`bg-slate-950`) was what previously hid any
backdrop — the ViewBackdrop swap removes it, and panels stay legible because they own their
fill.

Accent is plumbed as CSS vars on the wrapper (`--acc: hsl(var(--{accent}))`, `--glow:
hsl(var(--{accent}) / 0.5)`). Nothing consumes them yet — intentional wiring for the Skin-Pass.

Wiring pattern, two shapes: content views (Archive, Phases) swap their `min-h-screen
bg-slate-950 … scanlines` root directly for `<ViewBackdrop>` (which owns
min-h-screen / scanlines / safe-bottom). Centered placeholder views (Strategium, Map,
Service Record) keep an inner `min-h-screen flex flex-col items-center justify-center px-6`
wrapper INSIDE `<ViewBackdrop>`, because ViewBackdrop's own root is a block, not a flex
centering container.

Accents in use: Archive→auspex, Strategium→plasma, Map→plasma, Phases→gold, Record→gold
(distinct Map/Campaign tones still open, deferred to the Skin-Pass).

BookDetail deliberately has NO backdrop: it is a text-dense dossier, not a station, and is
reached from multiple views (no "correct" room). Rule: every station view gets a backdrop;
the detail view deliberately does not.

Next track (own chat): Skin-Pass v1.3 — retire Cinzel→Orbitron for display type, make
components consume `--acc`, assign distinct Map/Campaign accent tones, and amplify Service
Record into the "achievement hall" grammar. Skeleton is done; skin is last.

### Skin-Pass v1.3 / Typo (COMPLETE)

Applied the finished accent/type layer on top of the ViewBackdrop skeleton.
Five atomic commits on main, each build-tested; the visible ones live-verified.

- `b8775ee` feat(theme): add --map and --campaign accent tokens. Additive
  `:root` HSL vars (`--map: 205 90% 55%`, `--campaign: 28 90% 52%`) + matching
  Tailwind colors. Not yet consumed — foundation only.
- `949e817` feat(theme): wire distinct Map and Campaign accents. MapView
  `accent="plasma"→"map"`, PhaseView `accent="gold"→"campaign"`. Map no longer
  shares plasma with Strategium; Campaign no longer shares gold with Record.
- `2a005bc` fix(css): define missing text-glow-plasma utility. Landing's
  cogitator label referenced `.text-glow-plasma` but the class was never
  defined (silent no-op). Mirrored the gold/auspex glow definitions.
- `bf16776` refactor(css): grimdark-panel consumes --acc with gold fallback.
  THE core lever. Panel border, primary glow shadow, and `::before` edge
  gradient now read the per-view `--acc`/`--glow` set by ViewBackdrop, with a
  `:root` gold fallback for views without a backdrop (Landing, BookDetail).
  Each station's panels now carry that station's accent from ONE CSS change —
  no JSX touched. State-bound `-pacified`/`-legendary` and the subtle
  `--gold-dim` edge / inset `--gold` shadow deliberately stay gold (no
  `--acc-dim` exists; those are depth cues, not colour carriers).
- `0798174` style(type): flip font-display to Orbitron-first. `display`
  font stack leads with Orbitron (mock direction) instead of Cinzel, synced
  across Tailwind config and the `.font-display` class. Cinzel kept as second
  fallback.

Live-verified (Tim): Archive green, Map blue, Campaign amber, Landing/BookDetail
gold via fallback. Strategium/Service Record show no accent yet — they are
still content-less placeholders with no `.grimdark-panel` elements to carry the
edge; the accent prop is set and will surface once those views get content.

Key decision — the `--acc` migration is deliberately scoped to `.grimdark-panel`
ONLY, not a mass utility rewrite. The ~123 hardwired `text-gold`/`text-auspex`/
`text-plasma` utilities across ~20 files stay as-is; converting them is a
separate later cleanup, not this sprint. Panel-level `--acc` gives the maximal
per-view colour shift at minimal risk (one CSS change, zero JSX).

Deferred / carried forward for the palette migration: the hardwired accent
utilities above; a possible border-brightness dim (border now carries full
`var(--acc)` vs the old `--gold-dim / 0.5` — accepted as intentional, no grell
complaint from Tim); Service Record achievement-hall grammar (own sprint).

### Sprint Cogitator-Live-Zone (COMPLETE)

First functional track after the visual passes: the Landing's Command
Cogitator, static since the bridge was built, now reads live reading state.
Four atomic commits on main, each build-tested, all live-verified on Vercel.

- `a29f4cd` feat(landing): wire live current-reading into cogitator screen.
  Landing pulls `currentReading` from ArchiveDataContext and renders the live
  assignment (title + parent/phase) in the painted black screen, falling back
  to STANDBY/NO SIGNAL when nothing is read. Display-only; frameless phosphor
  and `pointer-events-none` untouched.
- `5a62e7d` feat(landing): give cogitator phase its own line. Phase left the
  inline parent-context row and became its own bottom line; the middle row
  now carries the parent title alone and is dropped entirely for non-sub-item
  books (title → phase, no empty row).
- `0a97c5e` feat(landing): make live cogitator navigate to the reading dossier.
  Filled state is a `<button>` navigating to `/book/:entryId` using the item's
  OWN entryId — a sub-item lands on its own dossier, not the omnibus parent
  (resolveEntry in BookDetail resolves the child id). Only the filled state is
  interactive (`pointer-events-auto` on the button); STANDBY stays inert and
  the wrapper keeps `pointer-events-none` so surrounding stations never block.
- `56c347f` feat(landing): soft phosphor glow on cogitator hover. Hover swells
  the green text over ~200ms (color + text-shadow transition via a scoped
  `[data-cogitator-screen] button` rule in index.css) — a CRT-terminal feel,
  deliberately distinct from the stations' snappy gold box-glow. The whole
  black screen is the hover/click zone (`w-full h-full`); glow is text-shadow
  only, no box-shadow, to hold the frameless look.

Key decisions:
- Landing sits INSIDE ArchiveDataProvider (only outside AppLayout), so
  `useArchiveData()` is safe here — the provider renders its own loading/error
  screens first, so `currentReading` is settled when Landing paints; `null`
  means genuinely nothing is being read (→ STANDBY), never a load race.
- The data derivation is mirrored, NOT the CurrentAssignment component. That
  component is a gold-framed panel button; reusing it would break the frameless
  phosphor illusion. The cogitator spends `currentReading`'s shape, keeps its
  own bare-text presentation. Glimpse-not-depth: status glimpse here, depth in
  the dossier.
- text-shadow is not Tailwind-transitionable, so the hover glow lives in a
  scoped CSS rule, not a `hover:` utility — a utility toggle would hard-jump
  instead of glimmer.

## Campaign Skin + Layout Sprint (Cinzel / two-column / ring / scrollers)

Seven commits, Desktop, all live-green on main. Base 82c4f91 → HEAD
544b4ab.

- `0a06a9e` feat(type): swap display font Orbitron → Cinzel. font-display
  slot only (Cinzel-first, Orbitron kept as fallback) in tailwind.config.js
  and the .font-display rule in index.css. tactical/data slots stay
  Orbitron. Cinzel already in the Google Fonts @import — no import change.
- `a6aef70` feat(campaign): page-counter + current-assignment side by side.
  GlobalHeader XP-bar and children slot moved into one shared grid
  (grid-cols-1, md:grid-cols-2 when children present); old border-t
  separator and standalone children block dropped; header flattened
  (py-3→py-2, title mb-3→mb-2).
- `2eed965` feat(campaign): two-column master-detail. Accordion replaced by
  left phase list + right selected-phase book list. selectedPhaseId
  pre-seeded from currentReading.phase, falling back to first phase.
  PhaseCard: isExpanded→isSelected, chevron rotation dropped. PhaseDetail:
  onClose + close button removed, dead ScrollArea/ChevronUp imports
  dropped.
- `f302149` / `544b4ab` ring percent iterations — SEE lesson below.
- `7ac9b73` fix(header): label the bare completedItems/totalItems mini-stat
  ("ITEMS", auspex accent).
- `1a3afe8` feat(header): "X/8 SECTORS PACIFIED" line in the page-counter
  panel. GlobalHeader stays data-agnostic — two new NUMBER props
  (pacifiedSectors, totalSectors); derivation (phases with getPhaseStats
  progress >= 100) lives in PhaseView.

Key decisions & lessons:
- GlobalHeader is only rendered by PhaseView (verified via grep — the
  Archive.jsx hit is a comment). Header changes have no cross-view effect
  today.
- GlobalHeader stays DATA-AGNOSTIC: feed it numbers, derive in the page.
  The sectors-pacified line follows this — no phase objects in the header.
- Two-column columns scroll INDEPENDENTLY via fixed-height container +
  per-column overflow-y-auto, NOT via sticky. sticky with a guessed
  top-offset (lg:top-[220px]) did not match real header height and both
  columns scrolled together. Deterministic fix: grid gets
  lg:h-[calc(100vh-360px)], each column lg:h-full lg:overflow-y-auto.
  LESSON: prefer fixed-height + own-overflow over sticky when the header
  height is variable/unknown — sticky offsets are guesswork.
- Ring percent is STILL NOT RIGHT (open). Iteration 1 (f302149) put number
  on font-data + inline "%" but items-baseline pushed it above center.
  Iteration 2 (544b4ab) switched to items-center, digit-count sizing
  (text-[13px] at >=100 else text-[15px]), "%" as superscript suffix.
  User reports it still doesn't sit cleanly. NOT resolved — carry to next
  session. LESSON: the ProgressRing percent overlay is fiddly at 52px/68px;
  next attempt should probably preview in-browser or reconsider showing
  "%" at all in the small ring.

## Header-Overhaul Sprint (Ring / Dossier / 2×2-Grid / compact)

Zwölf Commits, Desktop, alle live-grün auf main. Base 524e44f → HEAD fdd62de.
Kette: a611c50 (ring % centered) · 5c3a761 (badge clip + sticky-comment) ·
4821ea3 (header-ring number bigger) · 74b980a (subFaction onto sub-item shape) ·
8c742d8 (scope stacked left, facts clearer) · 7f93b6f (CurrentBookDossier) ·
f4a898d (2×2 named-slot grid, mirror symmetry) · 7d89c24 (flex-fill — regression) ·
24df09b (center + tighten) · 89e7f9a (scroll fix attempt) · f4ee184 (revert to calc) ·
fdd62de (all four boxes lower, dossier one-line).

Key decisions & lessons:
- Header = 2×2 mirror grid. Left = project-general (page-counter + description/
  scope-facts), right = current book (assignment + dossier). auto-rows-fr keeps
  each row's left/right box equal height.
- GlobalHeader stays DATA-AGNOSTIC: numbers + a `description` string + two
  ReactNode slots (assignmentSlot, dossierSlot). No project objects. Rendered
  only by PhaseView.
- FactionMark is the single source of truth for alliance icon+tint+label;
  factionLabel(alliance) reads the same MARKS object. Archive.jsx filter labels
  are separate filter UI, not canonical.
- CurrentBookDossier is presentational + router-free (like CurrentAssignment),
  every field null-tolerant, returns null when empty.

- LESSON — flex-fill vs. independent inner scrollers (scroll regression):
  Commit 7d89c24 replaced the phase grid's fixed lg:h-[calc(100vh-360px)] with a
  flex-col fill where `main` became the scroll container (overflow-y-auto). That
  left the inner grid without a defined height, lg:h-full resolved to nothing,
  and the two columns (phase list / book list) lost their reference height —
  both scrolled together in `main` instead of independently. The independent
  scroll had been working before. A partial fix (89e7f9a) did not reliably
  restore it; only a full revert (f4ee184) to the calc structure did.
  RULE: an overflow scroll container on outer `main` is incompatible with inner
  columns that need their own h-full + overflow-y-auto — the outer scroller
  robs the inner grid of a defined reference height. When independent inner
  scrollers are required, the grid needs a FIXED defined height (calc(100vh-Xpx)),
  NOT a growing flex-fill container with its own overflow. A guessed-but-working
  magic value beats a "clean" flex-fill that breaks the inner scrollers. Do NOT
  re-replace PhaseView's calc height with flex-fill.

- PROCESS LESSON: the flex-fill rework solved a problem the user never had (they
  wanted header alignment + less empty space, not height decoupling). Result:
  detour commits + a broken core feature + frustration. Stay close to the user's
  actually-stated goal; don't introduce a preventive architectural "improvement"
  whose risk the user didn't ask for.

- Preview practice: render in-chat previews at REAL header width before optical
  decisions — narrow previews distort proportions (boxes look taller/emptier).

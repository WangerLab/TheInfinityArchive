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

Claude Code stops and waits for Tim's explicit go before push. On that go Claude Code executes the push/merge itself (device-dependent, below); Tim gives the go and verifies the result, he does not run the push/merge commands himself.

## Device Mode — Per Session

- **Desktop:** local filesystem, `git diff` review allowed, push directly
  to main after approval.
- **Mobile:** push only via `claude/*`-branch, then PR + squash-merge via
  the `gh` CLI in one pass (see Mobile Release Sequence). No
  `git push origin HEAD:main` (HTTP 403 from the Anthropic harness). Full
  file contents replace `git diff` for review (hard to read git diff on
  phone). Repo setting "Automatically delete head branches" is ENABLED —
  server-side cleanup after every squash-merge, no manual branch deletion
  needed.

## Mobile Release Sequence

After Tim's go-signal at sprint-commit completion, Claude Code executes
in one shot:

````
git push origin HEAD:claude/<sprint-id>
gh pr create --base main --head claude/<sprint-id> --title "<title>" --body "<body>"
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
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

### Sprint Faction-Sigil Integration: alpha-checker high-threshold, mask-sim verification, public/ cache-bust

Per-book faction sigils end to end: 40 white-silhouette PNGs in `public/sigils/`, a `faction_sigil` text column on `books` (287 classified / 62 NULL via a regex CASE on the POV-bearer `sub_faction`), threaded through useCatalog to both book shapes, and a `FactionSigil` component that tints the PNG via CSS `mask-image` + `bg-<alliance>`, falling back to `FactionMark` on null or load error. Omnibus parents (empty sub_faction) derive their display sigil from the most common child sigil in useCatalog. Three lessons:

- **Gemini "transparency" can be a checkerboard baked into the ALPHA channel at a partial value (~170)** — not only an RGB checker, not only a soft halo. Hardening alpha at a mid threshold (130) cuts THROUGH such a checker and pushes its squares to 255 → a crisp checkerboard, blurred to a cloud at 16px but sharp at 32px. RULE: inspect the alpha histogram; if bimodal (checker cluster ~170 + shape cluster 255), threshold HIGH (~210, in the clean gap) so checker → transparent, shape → solid. A fixed 130 harden is wrong for alpha-baked checkers.
- **Verify sigil alpha as a gold-on-dark MASK SIMULATION, never by mid-% alone.** A hard 0/255 checker has mid 0% and looks statistically clean while being visibly broken. The real tell is opaque% ≈ expected shape size (dark_angels 33%, not 61% — 61% = shape + checker-hardened-to-255) plus corners/background at uniform alpha 0.
- **`public/` assets don't cache-bust on replacement** (same filename → browser AND Vercel CDN-edge serve stale; incognito bypasses only the browser, not the CDN, which caches per-URL). Decisive test: open the raw asset URL with a `?v=N` query (new URL → bypasses both → origin). Durable fix: an `ASSET_VERSION` query in FactionSigil's mask URL, bumped on any asset replacement. The cost of path-based `public/` over fingerprinted `assets/`.

### Sprint Phases-Optik-Politur: RGB-vs-Alpha-Karo, calc-Header-Kopplung, Titelbreite als Layout-Hebel

Zehn-Commit-Optik-Sprint am Phases-Menü (Header verschlankt, Alliance-Marks als getönte Sigils, BookRow-Datenblock, CurrentAssignment-Umbau, Omnibus-Faction-Ableitung). Drei übertragbare Lessons:

- **RGB-Karo ≠ Alpha-Karo.** Gemini liefert "transparente" Silhouetten mal als Alpha-Checker (Vorsession: Karo IM Alpha-Kanal bei ~170, Hochschwelle ~210 nötig), mal als reines RGB-Schachbrett bei durchgehend opakem Alpha (255). Beim RGB-Karo ist die Maske aus der LUMINANZ zu bauen: Threshold in die Lücke zwischen Karo-Grau und weißer Form (255) legen — und die Schwelle PRO BILD wählen, weil die Karo-Grautöne variieren (hier: imperium-Karo ~88/135 → thr 200; xenos-Karo ~0/88 → thr 160). Immer als Gold-auf-Dunkel-Maske gegenprüfen: opaque% ≈ Formgröße (~13–15%), Ecken Alpha 0. Vor dem Threshold das Alpha-Histogramm ansehen — ist es unimodal bei 255, liegt das Karo im RGB, nicht im Alpha.

- **Die calc-Höhe des Phasen-Grids ist an die Header-Höhe gekoppelt.** PhaseView nutzt `lg:h-[calc(100vh-Xpx)]` (fixe Höhe für unabhängige Spalten-Scroller, NICHT flex-fill — siehe frühere Scroll-Lektion). X ist gegen die reale Header-Höhe kalibriert. JEDE Header-Änderung (Zeile raus, Padding, Ring weg) muss X mitziehen, sonst bleibt unten eine Lücke oder der rechte Scroller wird abgeschnitten. Über diese Session wanderte X von 360 → 325 → 270. Der Wert ist ein Schätz-und-Justier-Wert: nach dem Deploy prüfen, ob unten Lücke oder Abschnitt.

- **Fixe Titelbreite ist der Hebel für die Datenblock-Position in Zeilen.** In BookRow sitzt POV/Sektor links (mit Abstand zum Titel, dann Spacer, Status rechts) — erreicht durch `w-[300px] shrink-0` am Titelblock plus `flex-1`-Spacer VOR dem Status. Nicht durch `justify-between` o.ä. Die fixe Breite hält zusätzlich die Datenblöcke aller Zeilen vertikal fluchtend (Titel `truncate` statt Umbruch). Wenn ein Zeilen-Element "weiter links / mit Abstand" soll: feste Breite am linken Nachbarn + Spacer, nicht Margin-Raten.

### Sprint Campaign-Finish: stacking contexts, utility-vs-class precedence, and diagnosing before building

Thirteen commits closing out the Campaign/Phases view: a counting bug, a data seed, and a four-round fight to get the backdrop through the header. Four transferable lessons — the last one is the expensive one.

- **A negative z-index puts an element behind the BODY background, not just behind its siblings.** `ViewBackdrop` sat at `zIndex: -10` and its art was invisible across the top of every view. Cause: `body` carries an opaque `background-color` plus a fixed noise/grunge layer, and a negative z-index places an element behind the background of its stacking-context ancestor. The art was there the whole time — behind the body fill. It surfaced ONLY where a `.grimdark-panel` spawned its own stacking context through `backdrop-filter`, which is why the image appeared behind the boxes and nowhere else, and why it looked like a transparency problem rather than a layering one. Fix: art layer at `zIndex: 0`, content wrapper at `zIndex: 10`. RULE: if a `fixed inset-0` backdrop is invisible, check the body background before touching opacity.

- **Anything rendered as a SIBLING of the `<Outlet />` sits outside the view's backdrop.** `AppNav` lives in `AppLayout` next to the Outlet, so lifting the art out of its negative z-index promptly covered the nav. It needed `relative z-10` of its own. RULE: the ViewBackdrop only governs its own subtree — layout chrome above it needs an explicit z-index.

- **A Tailwind `bg-*` utility silently defeats `.grimdark-panel`.** `CurrentAssignment` carried `grimdark-panel` AND `bg-gradient-to-r from-gold/10 to-transparent`. The utility sets `background-image` and overrides the class's gradient outright — so the box had no panel fill at all, just a gold wash fading to nothing. It looked like a panel, it was named like a panel, and it was the only one of four boxes without a ground. RULE: before tuning `.grimdark-panel` to fix one box, verify that box actually CARRIES the class effectively. Any `bg-gradient-*` / `bg-[...]` utility on the same element wins.

- **PROCESS LESSON — diagnose, then build. Three claimed causes, none verified, before the real one.** The bright-box problem got three confident explanations in a row (dark art behind it; the header band; the panel fill being too thin) and a commit for each, before the actual cause was found by READING THE FULL className. Commit `815800d` is the scar: it raised `.grimdark-panel` from `0.6/0.68` to `0.82/0.88` app-wide to catch a box that never had the class working — it missed its target and darkened every panel in every view instead. The grep that would have caught it was run early on, but only its first matching line was read; the overriding utility sat one line below. RULES: (1) read the FULL className list, not the first match; (2) state the cause and the evidence for it BEFORE writing the prompt — if there is no evidence, go get it; (3) a fix that changes an app-wide token to solve a single-component symptom is a smell, not a solution.

- **Duplicated counting logic hides readers — the same lesson, a third time.** `globalStats` still resolved sub-item progress through the NESTED store (`progress?.contents?.[subEntryId]`) long after the omnibus sub-items sprint moved to FLAT (`bookProgress[subEntryId]`). The dead branch always returned `undefined`, so every read omnibus child counted as unread — the DB held 9 read sub_items while the header showed 14 completed instead of 23. `getPhaseStats` had been migrated correctly at the time via `isFlatRead()`; `globalStats` was missed. There is still a THIRD copy (`calculateStats` in `PhaseDetail.jsx`). RULE: when a store shape changes, grep for every reader of the old shape and fix them in one commit — or centralise first, then change the shape.

### Sprint Auspex-Politur: backdrop-filter als Stacking-Context-Falle, Freitext-Metadaten, zwei Felder für zwei Fragen

Zwölf Commits am Archive/Auspex-View: Filter-Dropdowns, zweispaltiger Katalog, Sigil-Backfill, Dubletten-Bereinigung. Vier übertragbare Lessons.

- **`backdrop-filter` macht einen Stacking Context — `z-50` kommt da nicht raus.** Die geöffneten Filter-Dropdowns wurden vom Katalog-Panel überdeckt, obwohl sie `z-50` trugen. `.grimdark-panel` setzt `position: relative` PLUS `backdrop-filter: blur(6px)`; das ist ein eigener Stacking Context mit `z-index: auto`. Header-Panel und Katalog-Panel sind zwei solche Geschwister, beide `auto` — bei Gleichstand gewinnt der SPÄTERE im DOM. Das `z-50` des Dropdowns rangierte nur INNERHALB des Headers und konkurrierte nie mit dem Katalog. Fix: explizites `z-30` auf dem Header-Panel. REGEL: bei jedem "z-index wirkt nicht" zuerst prüfen, ob ein Vorfahre `backdrop-filter`, `transform`, `filter` oder `opacity < 1` trägt — jedes davon sperrt Kinder in einen eigenen Kontext ein. Dieselbe Eigenschaft, die im Campaign-Sprint die Backdrop-Kunst NUR hinter den Panels sichtbar machte.

- **Ein Panel, das man einem Container gibt, kann einem anderen Element den z-index brechen.** Das Katalog-Panel entstand in `a8f2404` (Zeilen brauchten Grund unter dem POV-Block, s.u.); der Dropdown-Bug in `cea459d` ist dessen direkte Folge. Vorher gab es dort kein Panel und `z-50` hätte funktioniert. REGEL: `.grimdark-panel` auf einen NEUEN Container zu legen ist keine reine Optik-Änderung — es setzt einen Stacking Context, und alles, was darüber liegen soll, braucht ab dann ein explizites z-index.

- **`bg-gradient-to-r ... to-transparent` ist eine Layout-Annahme, keine Farbe.** `BookRow` lief nach rechts auf volle Transparenz aus. Einspaltig egal — rechts war Leerraum. Zweispaltig (`e911103`) fiel der POV/SECTOR-Block in den transparenten Teil und stand nackt auf der grünen Auspex-Art. Sah aus wie ein Schriftfarben-Problem (grün auf grün), war ein fehlender Grund. In Campaign trat es nie auf, weil `PhaseDetail` seine Zeilen in ein `.grimdark-panel` wickelt — die Zeile darf transparent auslaufen, weil das Panel den Grund liefert. Fix war die fehlende Panel-Ebene in Auspex, NICHT eine Änderung an BookRow: die Komponente muss in beiden Views identisch lesen. REGEL: Campaign ist der Referenz-View. Bevor ein View-spezifischer Fix gebaut wird, nachsehen, wie Campaign dasselbe Problem löst.

- **Zwei Felder, zwei Fragen — ein Widerspruch in der Anzeige ist noch kein Datenfehler.** `faction_sigil` (aus `sub_faction`) sagt WER ERZÄHLT; `grand_alliance` (aus `faction_primary`) sagt WORUM ES GEHT. Bei 174 von 176 Einträgen dasselbe, bei zweien nicht: Leviathan ist ein Tyraniden-Roman aus Ultramarines-Sicht, Apocalypse ein Word-Bearers-Roman aus Imperial-Fists-Sicht. `FactionSigil` tönte die Silhouette (POV) nach der Alliance (Thema) → Ultramarines-Symbol in Xenos-Grün. BEIDE Felder waren korrekt; falsch war, dass die Tönung eine Frage beantwortete, die die Silhouette nicht gestellt hatte. `grand_alliance` "zu korrigieren" hätte Leviathan zu einem Imperium-Buch erklärt. Fix: `SIGIL_ALLIANCE`-Tabelle, Tönung nach der Alliance des Sigils selbst. REGEL: bevor Daten "bereinigt" werden, prüfen, aus welcher Quellspalte jedes Feld abgeleitet ist — ein Widerspruch zwischen zwei Feldern ist oft ein Anzeigefehler, kein Datenfehler.

- **Freitext-Metadaten sind für Menschen lesbar und für Queries unsichtbar.** Apocalypse erschien im flachen Katalog doppelt. Die Ursache stand seit jeher in den Daten: `also_in` = "P3-30 - SAME NOVEL do not double-count". Der Leseplan listet den Roman bewusst in zwei Phasen; Campaign zeigt ihn zu Recht in beiden, der flache Katalog darf ihn nur einmal zeigen. Fix: neue Spalte `duplicate_of` (entry_id der kanonischen Zeile, sonst NULL), Migration I-2. REGEL: wenn eine Regel in einem Freitextfeld steht ("do not double-count"), existiert sie für den Code nicht. Sie gehört in eine Spalte, bevor irgendein View sie beachten kann.

- **⚠️ FALLE, bewusst offen gelassen: `duplicate_of` und Seitenzahlen sind gegenläufig.** Die Quer-Listung P3-30 trägt `pages = 560`, die kanonische Zeile P5-13 trägt NULL. Heute konsistent — der globale Seitenzähler zählt den Roman genau einmal. ABER: wer künftig eine Statistik über den flachen Katalog baut und `duplicate_of IS NOT NULL` ausfiltert, verliert diese 560 Seiten lautlos. Der saubere Zustand wäre, die Seitenzahl auf die kanonische Zeile zu ziehen — das verschiebt 560 Seiten von Phase 3 nach Phase 5 und bewegt beide Fortschrittsbalken. Nicht ohne bewusste Entscheidung anfassen.

- **PROZESS-LESSON: geerbte Magic Numbers sind ungeprüfte Annahmen.** `lg:h-[calc(100vh-270px)]` wurde 1:1 aus PhaseView nach Auspex übernommen, obwohl Auspex einen ganz anderen Kopfbereich hat, und blieb den ganzen Sprint über unverifiziert — auch nachdem der Header in `1100cd9` um zwei Zeilen schrumpfte. Der Wert ist NICHT kalibriert. Steht als offener Punkt im Handover. REGEL (Wiederholung aus dem Phases-Sprint): X ist an die reale Header-Höhe gekoppelt und muss bei JEDER Header-Änderung mitgezogen und am Deploy geprüft werden.

### Sprint Auspex-Omnibus-Split: eine CSS-Property pro className, konkurrierende flex-1, Freitext-Sigil-Ableitung

Sieben Commits: Omnibusse im flachen Katalog in ihre Kinder aufgetrennt (Parent raus, Kinder als eigene Zeilen mit O-Badge), BookRow-Datenblock von hartem Truncate auf raumfüllenden Umbruch, plus ein Sigil-Sanity-Check über den ganzen Katalog. Vier übertragbare Lessons.

- **Zwei Klassen derselben CSS-Property in einem className — Tailwind löst das NICHT, die Stylesheet-Reihenfolge entscheidet.** Der Datenblock trug nach einem Prompt-Fehler `min-w-0 min-w-[170px]` gleichzeitig. Beide setzen `min-width`; welche gewinnt, hängt allein von der Reihenfolge im generierten CSS ab, nicht von der className-Reihenfolge. Eine ist immer tot. Direkte Verwandte der `bg-gradient`-Override-Lesson: eine spätere Utility derselben Property schlägt die frühere lautlos. REGEL: nie zwei Klassen derselben Property (min-w, w, bg-*, text-*) in einen className schreiben — die Absichten kollidieren, ohne Fehler. Der min-w-0-Anker gehört auf die truncate/break-Kinder, das feste Minimum auf den Container; nicht beides an denselben Knoten.

- **Zwei flex-1 in einer Zeile teilen sich den Raum — keiner bekommt ihn ganz.** Der POV/Sektor-Block brach viel zu früh um (dreizeilig bei "Interrogator-Chaplain Boreas"), während rechts die halbe Zeile leer stand. Ursache: der Datenblock war `flex-1` UND ein separater Spacer-div direkt danach war `flex-1`. Beide wuchsen gleich, der Block bekam nur die Hälfte, ein zusätzliches `max-w-[440px]` deckelte ihn zu früh. Der große Leerraum WAR der Spacer. Fix: Spacer weg, Deckel weg — der Datenblock als einziger Grower schiebt den `shrink-0`-Status von selbst nach rechts. Ein BEDINGTER Spacer (`{!hasDataBlock && <div className="flex-1" />}`) hält den Status rechtsbündig für Zeilen ohne POV/Sektor. REGEL: es darf genau EIN flex-1 den freien Raum beanspruchen; will man einen shrink-0-Nachbarn nach rechts drücken, wächst der Inhaltsblock selbst, kein zweiter Spacer daneben.

- **items-center am flex-Container zentriert jede Zeile auf die höchste Zelle — beim Umbruch reißt das die Optik auf.** Sobald POV/Sektor umbrechen dürfen (`break-words` statt `truncate`), wächst die Zeile vertikal. Bei `items-center` schwimmen Sigil und Status dann in der Mitte einer zweizeiligen Zeile. Fix: Container auf `items-start` (alles oben-bündig), und die Label/Wert-Wrapper (`POV`/`SECTOR`) ebenfalls von `items-baseline` auf `items-start`, damit das Label bei zweizeiligem Wert oben bleibt statt an der Grundlinie der letzten Zeile zu kleben. REGEL: sobald ein Zeilen-Element umbrechen darf, muss der Container `items-start` tragen — sonst zentriert der Umbruch alle Geschwister.

- **Der Sigil-Seed las das ERSTE Fraktions-Glied — ein Klammerzusatz kann die Hauptfraktion überstimmen.** `faction_sigil` wurde per Regex-CASE über `sub_faction` geseedet. Bei *The Talon of Horus* (`sub_faction = "Black Legion (former Sons of Horus & Thousand Sons remnants)"`) traf die Regex "Thousand Sons" im Klammerzusatz, bevor "Black Legion" am Anfang matchte → falsches `thousand_sons`-Sigil, obwohl das Buch die Black Legion trägt. Ein Sweep über alle 108 Einträge mit komplexem `sub_faction` (Klammern, Semikolon, "former"/"remnant"/"&"/"/") fand GENAU diesen einen echten Fehler plus einen Grenzfall (*Witchbringer*: "Scholastica Psykana; Cadian 900th" → `inquisition`, sachlich eher `astra_militarum`). Beide live via MCP korrigiert (Dry-Run zuerst: 2 Zeilen, will_change=true). Das System ist ansonsten sauber — Nachfolgekapitel wie "Soul Drinkers (Imperial Fists successor)" → `imperial_fists` sind korrekt. REGEL: eine Regex-Ableitung über ein Freitextfeld ist nur so gut wie ihre Trefferreihenfolge; ein Klammer-/Zusatz-Glied kann die Primärfraktion überstimmen. Bei jedem neuen Sigil-Seed die komplexen sub_faction-Zeilen gegen ihr Ergebnis gegenprüfen, nicht nur die einfachen.

- **HINWEIS, bewusst offen: Alliance-vs-POV-Sweep nicht durchgeführt.** *Leviathan* (P5-31) trägt `grand_alliance = xenos` bei Ultramarines-POV — kein Sigil-Fehler (Sigil korrekt `ultramarines`), sondern die bekannte Zwei-Felder-Frage aus dem Auspex-Politur-Sprint (WER erzählt vs. WORUM es geht). Ob `grand_alliance` katalogweit konsistent das thematische Lager statt der POV-Fraktion abbildet, ist ein eigener Sweep mit eigener Alliance-Semantik. Für eine eigene Session vorgemerkt, NICHT in diesem Sprint angefasst.

### Sprint Context Drop: Serverless-Erstkontakt, erzwungene Tool-Struktur, Drei-Konsumenten-Architektur

Das größte Feature bisher: diktierte Reflexion → Sonnet 4.6 strukturiert → drei Konsumenten (Mensch/Strategium/Suno). Erste Serverless Function im Projekt, neue Backdrop-Kunst, Reflection-UI-Konsolidierung. Übertragbare Lessons:

- **Vercel Serverless Functions liegen bei `frontend/`-Root-Directory unter `frontend/api/`, NICHT im Repo-Root.** Vercel löst `api/` relativ zum Root Directory auf. Verifiziert wurde das NICHT durch Raten, sondern durch eine triviale Wegwerf-Function `frontend/api/ping.js`, die `{ok, hasAnthropicKey, node}` zurückgibt — erst als die live JSON lieferte (Pfad erkannt, env var da, SPA-Rewrite schluckt `/api/*` nicht), wurde die echte Logik gebaut. REGEL: bei neuer Infrastruktur (erste Function, erster neuer Pfad-Typ) zuerst einen minimalen Health-Check deployen, der die eine Unbekannte isoliert beweist — ein Fehlschlag soll billig und eindeutig sein, nicht in 200 Zeilen Logik versteckt. `build green ≠ runtime green` gilt für Functions doppelt: der Frontend-Build ist grün, auch wenn die Function nie deployt.

- **Secrets gehören als Vercel-Env-Var OHNE `REACT_APP_`-Präfix in die Function-Runtime, nie ins Client-Bundle.** Alles mit `REACT_APP_` wird von CRA ins Browser-Bundle gebacken und ist öffentlich. Der Anthropic-Key läuft als `ANTHROPIC_API_KEY` (kein Präfix) serverseitig; die Function liest ihn via `process.env`. Supabase-anon-key darf `REACT_APP_` sein (durch RLS geschützt), ein Anthropic-Key NIEMALS. Der `ping`-Health-Check gibt `hasAnthropicKey` als Boolean zurück (nie den Key), um die Runtime-Verfügbarkeit zu prüfen.

- **Strukturierte LLM-Ausgabe über `tool_use` mit `tool_choice: {type:'tool', name:...}` erzwingen, NICHT über "gib mir JSON".** Ein erzwungener Tool-Call mit `input_schema` garantiert ein valides Schema-Objekt — das Modell KANN keine Prosa-Präambel voranstellen. Das eliminiert die häufigste Fehlerquelle strukturierter Ausgabe. Enums (`emotional_register`, `appetite_direction`) direkt ins Schema, `required`-Felder erzwingen definierte Struktur (leeres Array statt fehlendem Feld).

- **Ein bewusster, einmaliger Schreibvorgang gehört NICHT in eine Debounce-Sync-Kette, die für kontinuierliches Tippen gebaut ist.** Rating/Notes/Take laufen über eine 600ms-debounced Kette (`setBookProgress` → `flush` → upsert). Der Context Drop ist ein atomarer One-Shot ("strukturiere und speichere") → eigener direkter `handleContextDropSave`, der die Felder in EINEM upsert schreibt, mit demselben supabase-Client + User-Session (dieselbe RLS-Auth). KRITISCH: nach dem Direktwrite `lastSyncedRef` im selben Zug mitpatchen, sonst sieht die nächste Debounce-Runde die neuen Felder als Diff und schreibt mit ihrem eigenen (die Felder nicht listenden) Payload drüber. REGEL: Direktwrite und Debounce-Kette koexistieren nur konfliktfrei, wenn `lastSyncedRef` in Lockstep bleibt.

- **Felder, die nur gelesen und per Direktwrite geschrieben werden, MÜSSEN aus `entryChanged`/`normalizeEntry` rausgehalten werden.** `chronicle`, `auspexReading`, `musicScenes` tauchen dort NICHT auf — sonst nähme die Debounce-Kette sie in ihr Diff/Payload auf (das die Spalten gar nicht kennt). Reiner Lese-State plus Direktwrite, strukturell von der Debounce-Maschine getrennt.

- **Bei Schema-Feldwechsel (String→Array) defensiv rendern, sonst brechen bestehende Einträge.** `standout_moment` (String) wurde zu `standout_moments` (Array). Bereits gespeicherte Drops trugen noch den String. Die UI erkennt beide: `Array.isArray(x) ? x : x ? [x] : []`. Neuer Feldname (Plural) macht die Legacy-Erkennung eindeutig statt Typ-Check auf demselben Feld. REGEL: ein Schemafeld nie in-place umtypen ohne defensives Rendering für die alte Form — die DB hält alte Daten weiter.

- **Drei-Konsumenten-Architektur: ein Diktat, drei Ableseebenen, drei Ablageorte.** Chronicle (`jsonb`, mensch-sichtbar, Prosa, Spoiler ok) für DICH in Jahren; auspex_reading (`jsonb`, eingeklappt, kontrolliertes Vokabular) für das Strategium; music_scenes (eigene `jsonb`-Spalte) für den Suno-Workflow. Jeder Konsument bekommt seinen eigenen Ablageort nach seiner Abfrage-Achse — music_scenes NICHT in chronicle/auspex gefaltet, weil der Suno-Connector Szenen katalogweit unabhängig zieht (`WHERE music_scenes IS NOT NULL`). REGEL: wenn ein Datum von einem eigenständigen Konsumenten auf einer eigenen Achse abgefragt wird, bekommt es eine eigene Spalte, nicht ein Unterfeld eines fremden Blocks.

- **Bei APPEND/Merge bestehende Daten als "preserve all"-Kontext ans Modell zurückgeben, sonst Datenverlust.** APPEND webt neues Diktat in die bestehende Chronicle. Ohne die alten `music_scenes` als Erhaltungs-Kontext würde das Modell bei einer Ergänzung ohne neue Szene das Feld leer zurückgeben → der Save überschriebe die früher markierte Szene. Lösung: bestehende Szenen mitschicken mit expliziter "preserve them ALL"-Anweisung. Das Rohdiktat wird bei APPEND angehängt (`--- ADDITION ---`-Trenner), nie überschrieben — Audit-Trail bleibt vollständig. Asymmetrie bewusst: nur die Chronicle wird bewahrt, das auspex_reading wird aus dem Gesamttext NEU abgeleitet (eine Ergänzung darf das emotionale Bild verschieben).

- **Extraktion nur aus expliziter Nutzer-Markierung, nie aus Inferenz — `UNKNOWN`-vor-Halluzination auf LLM-Ebene.** `music_scenes` zieht NUR Szenen, die der Leser im Diktat explizit markiert ("Szene für Musik", "daraus ein Song"), und gibt sonst ein leeres Array zurück. Das Schema weist "do NOT infer or invent" an. Dasselbe Prinzip wie bei den BL-GRP-Metadaten: lieber leer als erfunden.

- **BookDetail-Backdrop von generischem Reliquiar auf bespoke Manuskript-Kunst.** BookDetail nutzte das `Gilded_reliquary_vitrine`-Motiv, das die ViewBackdrop-Design-Spec eigentlich `/record` (Service Record) zuweist. Ersetzt durch bespoke `Illuminated_manuscript_lectern`-Kunst (Nano Banana, frontal, Aquila-Centrepiece). Löst den Bildkonflikt: Reliquiar ist jetzt frei für den künftigen Service Record. Neuer Dateiname = frische CDN-URL, kein `ASSET_VERSION`-Bump nötig (der gilt nur für gleichnamig ersetzte Sigils).

- **Reflection-UI konsolidiert: manuelle Felder raus, wo der Context Drop sie ersetzt.** Personal Take + Marginalia (getippte Textfelder) waren nach dem Context Drop redundant zur Chronicle → entfernt. SkullRating bleibt (numerische Wertung, andere Info-Art). `personal_take`/`notes`-DB-Spalten NICHT gelöscht (Koexistenz, alte Daten bleiben, UI in Git-Historie). REFLECTION-PENDING-Badge nur noch sichtbar, wenn keine Chronicle existiert. Toter Code (localTake/localNotes-State, Handler, Feather/Textarea/useEffect-Imports) nach grep-Verifikation entfernt.

# CLAUDE.md

Code conventions, commit rules, and lessons learned for The Infinity
Archive. Read this before making changes.

## Tech Stack

- **Frontend:** React 19 + Tailwind CSS, plain `react-scripts` (no CRACO)
- **UI primitives:** shadcn/ui + lucide-react + Framer Motion
- **State:** React hooks + localStorage (target: Supabase, Sprint B-2)
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

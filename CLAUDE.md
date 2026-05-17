# CLAUDE.md

Code conventions, commit rules, and lessons learned for The Infinity
Archive. Read this before making changes.

## Tech Stack

- **Frontend:** React 19 + Tailwind CSS, plain `react-scripts` (no CRACO)
- **UI primitives:** shadcn/ui + lucide-react + Framer Motion
- **State:** React hooks + localStorage (target: Supabase, Sprint B)
- **Build:** `cd frontend && yarn start` (dev), `yarn build` (prod)
- **Hosting:** Vercel with `frontend/` as Root Directory

## Code Conventions

- Functional React components only. No class components.
- File naming: `PascalCase.jsx` for components, `camelCase.js` for hooks/utils.
- Imports via `@/`-alias (configured in `jsconfig.json`).
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

- **Desktop:** local filesystem, git diff review allowed, push directly
  to main after approval.
- **Mobile:** push only via `claude/*`-branch, merge via GitHub Web UI.
  No `git push origin HEAD:main`. Full file contents replace git diff
  for review (hard to read git diff on phone).

## Lessons Learned

(Empty — will grow as we hit problems and solve them.)

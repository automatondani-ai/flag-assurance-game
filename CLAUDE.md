# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

Flag Explorer is a geography quiz game deployed at https://flag-explorers.vercel.app. Players are shown a country flag and must identify it. Before submitting, they wager a **confidence level (0–100%)** — correct answers earn +confidence points, wrong answers lose −confidence points. A wager of 0 means no points gained or lost. Players get 7 hints per game (progressive letter reveals). Scores are submitted to a global leaderboard backed by Upstash Redis.

## Commands

```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # tsc -b && vite build — runs TypeScript check then bundles
npm run lint      # ESLint over all .ts/.tsx files
npm run preview   # Serve the built dist/ locally
vercel --prod     # Deploy to production (https://flag-explorers.vercel.app)
```

There is no test framework. There are no test files.

## Architecture

### Three-phase game flow

The app has exactly three phases, driven by `GameState.phase`: `welcome` → `playing` → `results`. `App.tsx` switches between the three screen components based on this value.

### State management (`src/hooks/useGameState.ts`)

All game logic lives in a single `useReducer` hook. The reducer state is `ReducerState = GameState & { queue: Country[] }` — `queue` is kept in the reducer but stripped out before being exposed to components (the hook returns `state` and `queue` separately).

**Critical pattern:** `stateRef.current = reducerState` is maintained at the top of the hook so that timer callbacks (1500 ms feedback window, skip/end timers) can read the current state without becoming stale closures. Never add `reducerState` to `useCallback` deps — use `stateRef.current` inside callbacks instead.

The 1500 ms delay after every answer submission is enforced by `timerRef`. While a timer is active, `submitAnswer` and `skipQuestion` are no-ops. The timer fires `ADVANCE_ROUND` (or `END` on the last question).

### Answer log & server-side score verification

Every answered or skipped question is accumulated into `state.answers` as a `GameAnswer` (see `src/types/index.ts`). On the results screen, the full answers array is POSTed to `/api/leaderboard`. **The server ignores the client's claimed score** and recalculates it independently from the raw answers using `NORMALISED_COUNTRY_MAP`.

### Server/client boundary (`api/` vs `src/`)

`api/` is Vercel serverless functions; `src/` is the React client. **They cannot import from each other.** This means the country list is intentionally duplicated:

- `src/data/countries.ts` — full data: `name`, `flag` (flagcdn.com URL), `code`, `continent`, optional `aliases`
- `api/countries.ts` — minimal server copy: `code`, `name`, optional `aliases` only

**When you add or rename a country, you must update both files.** Aliases must also stay in sync.

`api/` uses `moduleResolution: node16` (Vercel's TypeScript config), which **requires `.js` extensions on all relative imports** (e.g. `import { NORMALISED_COUNTRY_MAP } from './countries.js'`).

### Fuzzy matching — two independent implementations

**Client (`src/utils/gameUtils.ts`):** Fuse.js with `threshold: 0.4` searching `name` and `aliases`. The normalised input is passed to Fuse; the best match is compared against `correctName` using `normaliseString()`.

**Server (`api/leaderboard.ts`):** Pure string logic — exact match → alias match → Levenshtein distance with an adaptive threshold (`≤1` for names ≤7 chars, `≤2` for longer names). Uses `NORMALISED_COUNTRY_MAP`, which pre-computes `normName` and `normAliases` at module load (NFC + lowercase).

`normaliseString(s)` is defined independently in both `api/leaderboard.ts` and `src/utils/gameUtils.ts` — the two cannot share code, so they must stay identical: `s.normalize('NFC').toLowerCase()`.

### Hint system

7 hearts per game (`totalHintsRemaining`). Each hint press reveals the next letter of the current country name via `buildHintDisplay()` in the reducer. `hintsUsed` resets to 0 per round; `totalHintsRemaining` never resets mid-game.

`HintHearts.tsx` exists but is **not used** — `GameScreen.tsx` inlines its own SVG hearts directly.

## Leaderboard API (`api/leaderboard.ts`)

- Redis sorted set key: `flag:leaderboard` (top 1000 kept)
- GET: returns top 10
- POST: validates body, checks honeypot, validates timing (≥10 s total, ≥2 s per answer), checks SHA-256 replay hash, recalculates score, stores entry
- Rate limits: 60/hr and 10/min per IP (Redis time-bucketed keys)
- Duplicate POSTs return **409**
- **Keep-alive cron** (`crons` in `vercel.json`): Vercel calls GET `/api/leaderboard` at 09:00 UTC on the 1st and 15th of each month. Upstash hibernates paid databases after 60 days without traffic, and a hibernated database blocks every Vercel deployment ("integration resources failed to provision"). The GET must stay uncached so the call really reaches Redis. Hobby plans only allow crons that run at most once a day

## Environment variables

Required on Vercel (never put in `src/`):

| Variable | Purpose |
|---|---|
| `KV_REST_API_URL` | Upstash Redis REST endpoint |
| `KV_REST_API_TOKEN` | Upstash Redis read/write token |

The server throws at cold start if either is missing.

## Styling conventions

- The look is shared with Damilola's portfolio and Chronograph: navy backgrounds, white cards, teal accent
- Fonts (Google Fonts in `index.html`): **Poppins** (`font-heading`) for headings, labels, scores and buttons; **Outfit** (`font-body`) for body text; **Fredoka One** (`font-logo`) only for the FLAG EXPLORER wordmark
- CSS custom properties (defined in `src/index.css`): `--color-navy`, `--color-navy-deep`, `--color-ink`, `--color-paper`, `--color-sky`, `--color-teal`, `--color-teal-ink`, `--color-coral`, `--color-coral-ink`. Use the `-ink` variants for text on white cards; the plain teal/coral are too light there
- All three screens use the navy background; each screen root has the `.screen` class (full height below the site bar)
- Reusable CSS classes in `index.css`: `.card-stage` (the main content card), `.flag-container`, `.pill-input`, `.btn-primary`, `.btn-outlined-teal`, `.btn-outlined-coral`
- **Shared site bar**: the `<nav class="sb">` strip in `index.html`, styled by `src/site-bar.css`. That file must stay identical to the copies in the portfolio and Chronograph repos. It is 52px tall (`--site-bar-h`), so sticky elements use `lg:top-[76px]`
- Tailwind v3 is used alongside custom CSS classes — not as a replacement
- Decorative emoji sit on the **screen background** `div`, never inside `.card-stage`

## Known issues / technical debt

- **`HintHearts.tsx` is dead code** — the component exists but nothing imports it; `GameScreen` renders hearts inline
- **`src/App.css`** is leftover Vite scaffolding and is not imported anywhere
- **`src/assets/react.svg`** and **`src/assets/vite.svg`** are unused Vite scaffolding
- **`npm audit`** reports vulnerabilities in `@vercel/node` transitive dependencies — all are devDependency-only with zero runtime exposure; upgrading to `@vercel/node@4` would be a breaking change
- **Country data sync** is manual — `src/data/countries.ts` and `api/countries.ts` must be kept in sync by hand; there is no build-time check that enforces this

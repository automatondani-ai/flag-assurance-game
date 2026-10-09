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

### Answer rule — one rule, copied into client and server

The screen (`checkAnswer` in `src/utils/gameUtils.ts`) and the leaderboard (`api/leaderboard.ts`) judge answers with the **same code**. It lives in the block between `── Answer rule ──` and `── End of answer rule ──`, copied word for word into both files because they can't import each other. Keep the two blocks identical; `diff` them after any change. Before October 2026 the client used Fuse.js and the server used Levenshtein, and they disagreed on hundreds of typos: "Nigeira" showed Correct but scored as wrong.

- **Normalising** (`normaliseAnswer`):
  - lower-case
  - accents dropped ("São Tomé" → "sao tome")
  - curly apostrophes straightened
  - "&" read as "and"
  - single spaces
  - a leading "the" removed ("The Gambia")

  Empty answers and answers over 45 characters are wrong.
- **When an answer is right:** it is within the allowed typos of the country's name or one of its aliases.
  - None for short forms of up to 3 letters ("USA", "UK", "NZ" must be exact, so "u" isn't the US).
  - 1 edit for spellings of up to 7 letters, 2 for longer ones.
  - Swapping two neighbouring letters counts as one edit (optimal string alignment).
- **Aliases** cover common names that aren't typos: USA / America, UK / Great Britain, Holland, Czechia, Cape Verde, Türkiye, Bosnia, Burkina, Korea, KSA… Never add an alias two countries could share (e.g. a bare "Congo").
- **Another country can't be closer:** "Iraq" is not a typo of "Iran", and "Niger" is wrong for Nigeria. Ties count as right.
- **Part of a name on its own** ("Burkina", "South") is wrong unless it's an alias. Add common short names as aliases in **both** country lists.
- **Keys:** the client keys countries by name; the server keys them by code via `NORMALISED_COUNTRY_MAP`.

### Hint system

7 hearts per game (`totalHintsRemaining`). Each hint press reveals the next letter of the current country name via `buildHintDisplay()` in the reducer. `hintsUsed` resets to 0 per round; `totalHintsRemaining` never resets mid-game.

`HintHearts.tsx` exists but is **not used** — `GameScreen.tsx` inlines its own SVG hearts directly.

### How to play tour (`HowToPlayTour.tsx`)

- **When it opens:** `GameScreen` opens it on the first flag of a player's first game in a browser. The `flag_explorer_tour_seen` key in localStorage (`src/utils/tour.ts`) records that. It also opens from the How to play buttons: the sidebar link, and `?` in the phone top bar.
- **The four steps:** each one rings a live control found by its `data-tour` attribute: `answer`, `confidence`, `hints` and `score`. `score` exists twice, in the phone bar and in the sidebar, and the tour uses whichever is visible. If you move or rename those elements, keep the attributes.
- **The game clock:** it is paused while the tour is open (`pauseClock` / `resumeClock` in `useGameState`), so tour time never counts towards the leaderboard TIME.
- **Rendering:** the tour is portalled to `<body>`. `.phase-enter` leaves a transform on the screen, which would otherwise make `position: fixed` relative to the screen and offset the ring by the site bar's 52px.
- **The spelling examples** (Nigeria / Nigria / Niger, or Brazil when the flag is Nigeria or Niger) were checked against both answer checks. If you change the matching rules, re-check them.

## Leaderboard API (`api/leaderboard.ts`)

- Redis sorted set key: `flag:leaderboard` (top 1000 kept)
- **One row per player per region.**
  - A player is the same name (case and extra spaces ignored) playing the same region string ("Africa", "World", "Africa, Europe"…).
  - The hash `flag:leaderboard:best` maps `playerKey(name, region)` to that player's row.
  - A POST is stored only if it beats that row's score (a tie keeps the earlier game), and then it replaces the row.
  - The response includes `best: true|false`.
- GET: reads the top 100 rows, returns the top 10 *different* players (ranks 1–10), and deletes any repeat rows it finds. Those are rows saved before the one-row rule, or a returning player's first game after it.
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
- Reusable CSS classes in `index.css`: `.card-stage` (the main content card), `.flag-container`, `.flag-img`, `.pill-input`, `.btn-primary`, `.btn-outlined-teal`, `.btn-outlined-coral`
- **Every flag `<img>` needs `.flag-img`**: a drop-shadow hairline that traces the flag's own pixels, so white areas (Madagascar, Japan, Cyprus...) stay visible on the white cards. Give its container ~4px padding so `overflow: hidden` doesn't clip the edge
- **Shared site bar**: the `<nav class="sb">` strip in `index.html`, styled by `src/site-bar.css`. That file must stay identical to the copies in the portfolio and Chronograph repos. It is 52px tall (`--site-bar-h`), so sticky elements use `lg:top-[76px]`
- Tailwind v3 is used alongside custom CSS classes — not as a replacement
- Decorative emoji sit on the **screen background** `div`, never inside `.card-stage`

## Known issues / technical debt

- **`HintHearts.tsx` is dead code** — the component exists but nothing imports it; `GameScreen` renders hearts inline
- **`src/App.css`** is leftover Vite scaffolding and is not imported anywhere
- **`src/assets/react.svg`** and **`src/assets/vite.svg`** are unused Vite scaffolding
- **`npm audit`** reports vulnerabilities in `@vercel/node` transitive dependencies — all are devDependency-only with zero runtime exposure; upgrading to `@vercel/node@4` would be a breaking change
- **Country data sync** is manual — `src/data/countries.ts` and `api/countries.ts` must be kept in sync by hand; there is no build-time check that enforces this

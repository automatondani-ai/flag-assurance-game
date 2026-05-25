# Flag Assurance Game

A cartographic-themed flag-identification quiz where you wager your confidence on every answer. The higher your assurance, the more you gain — or lose.

## Overview

Each round shows a country's flag. You type your answer and set an **assurance level** (0–100) representing how confident you are. Score delta is `±assurance`: a correct answer at 84% assurance earns +84; a wrong answer costs −84. Scores can go negative. At the end of 68 rounds, you receive a performance tier and a final debrief.

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | [React 19](https://react.dev) |
| Build tool | [Vite](https://vite.dev) |
| Language | TypeScript |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) |
| Fonts | Playfair Display + IBM Plex Mono (Google Fonts) |
| Flag images | [flagcdn.com](https://flagcdn.com) (REST Countries format) |

## Project Structure

```
src/
├── components/
│   ├── WelcomeScreen.tsx   # Name entry, game intro
│   ├── GameScreen.tsx      # Flag display, answer input, assurance slider
│   ├── AssuranceSlider.tsx # 0–100 confidence wager control
│   └── ResultsScreen.tsx   # Debrief, animated score count-up
├── hooks/
│   └── useGameState.ts     # useReducer-based game lifecycle
├── data/
│   └── countries.ts        # 68 countries with flagcdn.com URLs
├── types/
│   └── index.ts            # GameState, Country, GamePhase types
└── utils/
    └── gameUtils.ts        # Fisher-Yates shuffle, score logic, tiers
```

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deployment

This project deploys to **Vercel** with zero configuration. Push to your GitHub repository, import it in the [Vercel dashboard](https://vercel.com), and it redeploys automatically on every push to `main`.

```bash
# Production build (output in dist/)
npm run build

# Preview the production build locally
npm run preview
```

## Game Rules

- Type the country name shown by the flag
- Set your assurance level (0–100) — this is your wager for that round
- **Correct**: score += assurance
- **Wrong**: score -= assurance
- Score can go negative
- 68 countries per game, shuffled randomly each run

## Performance Tiers

| Accuracy | Message |
|---|---|
| 0–38% | Better luck next time |
| 39–55% | Good! |
| 56–80% | Nice! You're a natural explorer. |
| 81–100% | You're giving Google a run for their money. Great! |

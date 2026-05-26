import { useReducer, useRef, useCallback } from 'react';
import type { GameState, Country, Continent } from '../types';
import { doubleShuffleArray, checkAnswer, calculateScoreDelta } from '../utils/gameUtils';
import { COUNTRIES } from '../data/countries';

// ─── Reducer State ────────────────────────────────────────────────────────────

type ReducerState = GameState & { queue: Country[] };

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START'; playerName: string; queue: Country[]; region: string; gameLength: number }
  | { type: 'RECORD_ANSWER'; delta: number; correct: boolean; resolvedName: string }
  | { type: 'ADVANCE_ROUND' }
  | { type: 'USE_HINT' }
  | { type: 'END'; duration: number }
  | { type: 'RESET' };

// ─── Hint Display Builder ─────────────────────────────────────────────────────

/**
 * Builds the progressive hint reveal string for a country name.
 *
 * Rules:
 * - Each letter (a-z, A-Z, accented Latin) has a sequential "letter index"
 *   that ignores spaces, hyphens, apostrophes, and other non-letter chars.
 * - A letter at letter-index i is revealed if i < hintsUsed, otherwise "_".
 * - Non-letter characters (spaces, hyphens, apostrophes) are always shown as-is.
 * - Every character in the result is separated by a single space for readability,
 *   so "Nigeria" (hintsUsed=2) → "N i _ _ _ _ _"
 */
function buildHintDisplay(name: string, hintsUsed: number): string {
  // Matches Basic Latin letters + Latin Extended (covers accented chars like ô, é, ñ)
  const LETTER_RE = /[a-zA-ZÀ-ɏ]/;
  let letterIndex = 0;
  const chars = name.split('').map(char => {
    if (LETTER_RE.test(char)) {
      const revealed = letterIndex < hintsUsed;
      letterIndex++;
      return revealed ? char : '_';
    }
    // Non-letter (space, hyphen, apostrophe, etc.) — always show as-is
    return char;
  });
  return chars.join(' ');
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL: ReducerState = {
  phase: 'welcome',
  playerName: '',
  score: 0,
  correctCount: 0,
  currentIndex: 0,
  totalQuestions: 0,
  lastDelta: null,
  lastCorrect: null,
  lastResolvedName: null,
  missedCountries: [],
  duration: 0,
  region: '',
  gameLength: 0,
  queue: [],
  // Hint system — reset to full budget on resetGame (RESET → INITIAL)
  hintsUsed: 0,
  hintDisplay: '',
  totalHintsRemaining: 7,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'START':
      return {
        queue: action.queue,
        phase: 'playing',
        playerName: action.playerName,
        score: 0,
        correctCount: 0,
        currentIndex: 0,
        totalQuestions: action.queue.length,
        lastDelta: null,
        lastCorrect: null,
        lastResolvedName: null,
        missedCountries: [],
        duration: 0,
        region: action.region,
        gameLength: action.gameLength,
        // Hint system — fresh budget for every new game
        hintsUsed: 0,
        hintDisplay: '',
        totalHintsRemaining: 7,
      };

    case 'RECORD_ANSWER': {
      const country = state.queue[state.currentIndex];
      return {
        ...state,
        score: state.score + action.delta,
        correctCount: action.correct ? state.correctCount + 1 : state.correctCount,
        missedCountries: action.correct
          ? state.missedCountries
          : [...state.missedCountries, country],
        lastDelta: action.delta,
        lastCorrect: action.correct,
        lastResolvedName: action.resolvedName,
      };
    }

    case 'ADVANCE_ROUND':
      // Atomically advances the index AND clears feedback + hint round state in
      // one render, so the new flag never appears with stale values.
      // NOTE: totalHintsRemaining is intentionally NOT touched here — the global
      // budget persists across all rounds and only resets on START / RESET.
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        lastDelta: null,
        lastCorrect: null,
        lastResolvedName: null,
        hintsUsed: 0,      // reset per-round hint counter
        hintDisplay: '',   // clear the reveal string for the new flag
      };

    case 'USE_HINT': {
      // Guard 1: no budget remaining — silently ignore
      if (state.totalHintsRemaining === 0) return state;

      const country = state.queue[state.currentIndex];
      if (!country) return state;

      // Guard 2: all letters already revealed for this round — silently ignore
      const LETTER_RE = /[a-zA-ZÀ-ɏ]/;
      const letterCount = country.name.split('').filter(c => LETTER_RE.test(c)).length;
      if (state.hintsUsed >= letterCount) return state;

      const newHintsUsed = state.hintsUsed + 1;

      return {
        ...state,
        hintsUsed: newHintsUsed,
        totalHintsRemaining: state.totalHintsRemaining - 1, // global budget: never resets mid-game
        hintDisplay: buildHintDisplay(country.name, newHintsUsed),
      };
    }

    case 'END':
      return { ...state, phase: 'results', duration: action.duration };

    case 'RESET':
      return INITIAL;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseGameStateReturn {
  state: GameState;
  queue: Country[];
  startGame: (playerName: string, continents: Continent[], length: number) => void;
  submitAnswer: (input: string, assurance: number) => void;
  useHint: () => void;
  resetGame: () => void;
}

const ALL_CONTINENT_COUNT = 5;

export default function useGameState(): UseGameStateReturn {
  const [reducerState, dispatch] = useReducer(reducer, INITIAL);

  // Always-current snapshot — lets timer callbacks read fresh state without
  // adding state to useCallback deps (which would recreate callbacks each tick).
  const stateRef = useRef(reducerState);
  stateRef.current = reducerState;

  // Non-null means a submission is in flight (feedback window active).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Records when the current game started, for computing duration on END.
  const startTimeRef = useRef<number>(0);

  const startGame = useCallback(
    (playerName: string, continents: Continent[], length: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // ── 1. Filter by continent ─────────────────────────────────────────────
      const filteredPool =
        continents.length === 0
          ? [...COUNTRIES]                                           // always work on a copy
          : COUNTRIES.filter(c => continents.includes(c.continent));

      // ── 2. Seed-based entropy pre-mix ──────────────────────────────────────
      // Combine wall-clock time with an extra random value so that rapid
      // back-to-back sessions (hot-reload, quick "play again") don't share
      // similar PRNG state entering the primary shuffle.
      const seed = Date.now() + Math.floor(Math.random() * 99999);

      const premixed = [...filteredPool];
      for (let i = 0; i < 5; i++) {
        // Two indices derived from independent linear-congruential steps of seed
        const a = Math.abs((seed * (i + 1) * 9301 + 49297)) % premixed.length;
        const b = Math.abs((seed * (i + 2) * 6271 + 31337)) % premixed.length;
        [premixed[a], premixed[b]] = [premixed[b], premixed[a]];
      }

      // ── 3. Double Fisher-Yates + rotation ─────────────────────────────────
      const queue = doubleShuffleArray(premixed).slice(0, Math.min(length, premixed.length));

      const region = continents.length >= ALL_CONTINENT_COUNT ? 'World' : continents.join(', ');
      startTimeRef.current = Date.now();
      dispatch({ type: 'START', playerName: playerName.trim(), queue, region, gameLength: queue.length });
    },
    [],
  );

  const submitAnswer = useCallback((input: string, assurance: number) => {
    // 0 assurance is explicitly allowed: correct → +0, wrong → -0 (no points risked).
    if (!input.trim()) return;
    if (timerRef.current) return;

    const { queue, currentIndex } = stateRef.current;
    const country = queue[currentIndex];
    if (!country) return;

    const { correct, resolvedName } = checkAnswer(input, country.name);
    const delta = calculateScoreDelta(correct, assurance);

    dispatch({ type: 'RECORD_ANSWER', delta, correct, resolvedName });

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const isLast = currentIndex >= queue.length - 1;
      if (isLast) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        // Score is saved in ResultsScreen after it mounts, so the
        // leaderboard can be refreshed immediately after the POST completes.
        dispatch({ type: 'END', duration });
      } else {
        dispatch({ type: 'ADVANCE_ROUND' });
      }
    }, 1500);
  }, []);

  const useHint = useCallback(() => {
    dispatch({ type: 'USE_HINT' });
  }, []);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, []);

  const { queue, ...gameState } = reducerState;
  return { state: gameState, queue, startGame, submitAnswer, useHint, resetGame };
}

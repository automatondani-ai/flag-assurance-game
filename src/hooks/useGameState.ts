import { useReducer, useRef, useCallback } from 'react';
import type { GameState, Country, Continent } from '../types';
import { shuffleArray, checkAnswer, calculateScoreDelta } from '../utils/gameUtils';
import { saveScore } from '../utils/leaderboard';
import { COUNTRIES } from '../data/countries';

// ─── Reducer State ────────────────────────────────────────────────────────────

type ReducerState = GameState & { queue: Country[] };

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START'; playerName: string; queue: Country[]; region: string; gameLength: number }
  | { type: 'RECORD_ANSWER'; delta: number; correct: boolean; resolvedName: string }
  | { type: 'ADVANCE' }
  | { type: 'END'; duration: number }
  | { type: 'RESET' };

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

    case 'ADVANCE':
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        lastDelta: null,
        lastCorrect: null,
        lastResolvedName: null,
      };

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
      const pool =
        continents.length === 0
          ? COUNTRIES
          : COUNTRIES.filter(c => continents.includes(c.continent));
      const queue = shuffleArray(pool).slice(0, Math.min(length, pool.length));
      const region = continents.length >= ALL_CONTINENT_COUNT ? 'World' : continents.join(', ');
      startTimeRef.current = Date.now();
      dispatch({ type: 'START', playerName: playerName.trim(), queue, region, gameLength: queue.length });
    },
    [],
  );

  const submitAnswer = useCallback((input: string, assurance: number) => {
    if (!input.trim() || assurance === 0) return;
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
        const s = stateRef.current;
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const percentage = s.totalQuestions > 0
          ? Math.round((s.correctCount / s.totalQuestions) * 100)
          : 0;
        saveScore({
          name: s.playerName,
          score: s.score,
          percentage,
          duration,
          date: new Date().toISOString(),
          region: s.region,
          gameLength: s.gameLength,
        });
        dispatch({ type: 'END', duration });
      } else {
        dispatch({ type: 'ADVANCE' });
      }
    }, 1500);
  }, []);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, []);

  const { queue, ...gameState } = reducerState;
  return { state: gameState, queue, startGame, submitAnswer, resetGame };
}

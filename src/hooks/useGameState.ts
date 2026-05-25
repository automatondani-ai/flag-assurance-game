import { useReducer, useRef, useCallback } from 'react';
import type { GameState, Country } from '../types';
import { shuffleArray, checkAnswer, calculateScoreDelta } from '../utils/gameUtils';
import { COUNTRIES } from '../data/countries';

// ─── Reducer State ────────────────────────────────────────────────────────────
// Extends GameState with the shuffled question queue, which is internal to the
// hook and never exposed as part of the public GameState interface.

type ReducerState = GameState & { queue: Country[] };

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START'; playerName: string; queue: Country[] }
  | { type: 'RECORD_ANSWER'; delta: number; correct: boolean }
  | { type: 'ADVANCE' }
  | { type: 'END' }
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
      };

    case 'RECORD_ANSWER':
      return {
        ...state,
        score: state.score + action.delta,
        correctCount: action.correct ? state.correctCount + 1 : state.correctCount,
        lastDelta: action.delta,
        lastCorrect: action.correct,
      };

    case 'ADVANCE':
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        lastDelta: null,
        lastCorrect: null,
      };

    case 'END':
      return { ...state, phase: 'results' };

    case 'RESET':
      return INITIAL;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseGameStateReturn {
  state: GameState;
  queue: Country[];
  startGame: (playerName: string) => void;
  submitAnswer: (input: string, assurance: number) => void;
  resetGame: () => void;
}

export default function useGameState(): UseGameStateReturn {
  const [reducerState, dispatch] = useReducer(reducer, INITIAL);

  // Always-current snapshot of reducer state for use inside timer callbacks,
  // avoiding stale closures without adding state to useCallback deps.
  const stateRef = useRef(reducerState);
  stateRef.current = reducerState;

  // Tracks the pending advance timer. Non-null means a submission is in flight.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startGame = useCallback((playerName: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const queue = shuffleArray(COUNTRIES);
    dispatch({ type: 'START', playerName: playerName.trim(), queue });
  }, []);

  const submitAnswer = useCallback((input: string, assurance: number) => {
    if (!input.trim() || assurance === 0) return;
    if (timerRef.current) return; // block double-submission during feedback window

    const { queue, currentIndex } = stateRef.current;
    const country = queue[currentIndex];
    if (!country) return;

    const correct = checkAnswer(input, country.name);
    const delta = calculateScoreDelta(correct, assurance);

    dispatch({ type: 'RECORD_ANSWER', delta, correct });

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const isLast = currentIndex >= queue.length - 1;
      dispatch(isLast ? { type: 'END' } : { type: 'ADVANCE' });
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

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Two-pass shuffle: Fisher-Yates followed by a random rotation offset.
 * The rotation breaks any residual low-entropy patterns that a single pass
 * can produce when Math.random() has not advanced much (e.g. quick restarts).
 */
export function doubleShuffleArray<T>(arr: T[]): T[] {
  const first  = shuffleArray([...arr]);
  const offset = Math.floor(Math.random() * first.length);
  return [...first.slice(offset), ...first.slice(0, offset)];
}

export function normalizeInput(input: string): string {
  return input.trim().toLowerCase();
}

import Fuse from 'fuse.js';
import { COUNTRIES } from '../data/countries';

const fuse = new Fuse(COUNTRIES, {
  keys: ['name', 'aliases'],
  threshold: 0.4,
  includeScore: true,
});

export function checkAnswer(input: string, correctName: string): { correct: boolean; resolvedName: string } {
  // Input length guard: prevent Fuse.js ReDoS on pathologically long strings.
  if (input.trim().length > 45) return { correct: false, resolvedName: correctName };

  const normalized = input.trim().toLowerCase();
  const results = fuse.search(normalized);

  if (results.length === 0) return { correct: false, resolvedName: correctName };

  const bestMatch = results[0].item.name;
  const correct = bestMatch.toLowerCase() === correctName.toLowerCase();

  return { correct, resolvedName: bestMatch };
}

/**
 * Returns the score delta for a question.
 * Assurance is a multiplier the player wagers (e.g. 1–5).
 * Correct answers earn +assurance; wrong answers lose -assurance.
 */
export function calculateScoreDelta(correct: boolean, assurance: number): number {
  return correct ? assurance : -assurance;
}

export interface PerformanceTier {
  message: string;
  percentage: number;
}

export function getPerformanceTier(score: number, total: number): PerformanceTier {
  const percentage = total === 0 ? 0 : Math.round((score / total) * 100);

  let message: string;
  if (percentage <= 38) {
    message = 'Better luck next time';
  } else if (percentage <= 55) {
    message = 'Good!';
  } else if (percentage <= 80) {
    message = "Nice! You're a natural explorer.";
  } else {
    message = "You're giving Google a run for their money. Great!";
  }

  return { message, percentage };
}

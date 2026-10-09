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

import { COUNTRIES } from '../data/countries';

// ── Answer rule ───────────────────────────────────────────────────────────────
// Keep this block identical in api/leaderboard.ts and src/utils/gameUtils.ts:
// the server and client can't import each other, and the score the player sees
// must be the score the leaderboard stores.

/** A country's accepted spellings (name and aliases), normalised. */
type AnswerForms = { key: string; forms: string[] };

/**
 * Lower-case without accents ("São Tomé" → "sao tome"), straight apostrophes,
 * "&" read as "and", single spaces, and no leading "the" ("The Gambia").
 */
function normaliseAnswer(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

/**
 * Most typos allowed: none for short forms of up to 3 letters (so "u" isn't
 * "US"), 1 for names of up to 7 letters, 2 for longer ones.
 */
function allowedEdits(length: number): number {
  return length <= 3 ? 0 : length <= 7 ? 1 : 2;
}

/**
 * Edit distance where swapping two neighbouring letters counts as one edit
 * (optimal string alignment), so "nigeira" is one typo away from "nigeria".
 */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Right when the answer is within the allowed typos of one of the target's
 * spellings and no other country's spelling is closer ("Iraq" is not a typo of
 * "Iran"). Ties count as right. Also returns the closest country's key.
 */
function judgeAnswer(
  input: string,
  targetKey: string,
  countries: AnswerForms[],
): { correct: boolean; closestKey: string | null } {
  const answer = normaliseAnswer(input);
  if (answer.length === 0 || answer.length > 45) return { correct: false, closestKey: null };

  let targetDist = Infinity;
  let targetLength = 0;
  let bestDist = Infinity;
  let bestKey: string | null = null;
  for (const country of countries) {
    for (const form of country.forms) {
      // Over 2 edits never decides anything: 2 is the most typos ever allowed.
      if (Math.abs(form.length - answer.length) > 2) continue;
      const dist = editDistance(answer, form);
      if (country.key === targetKey && dist < targetDist) {
        targetDist = dist;
        targetLength = form.length;
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestKey = country.key;
      }
    }
  }
  const correct = targetDist <= allowedEdits(targetLength) && targetDist <= bestDist;
  return { correct, closestKey: correct ? targetKey : bestKey };
}

// ── End of answer rule ────────────────────────────────────────────────────────

/** Every country's accepted spellings, keyed by country name. */
const ANSWER_FORMS: AnswerForms[] = COUNTRIES.map(c => ({
  key:   c.name,
  forms: [c.name, ...(c.aliases ?? [])].map(normaliseAnswer),
}));

/**
 * Same verdict the leaderboard API gives. `resolvedName` is the country the
 * answer was read as (shown as "matched: …" when it differs from what was typed).
 */
export function checkAnswer(input: string, correctName: string): { correct: boolean; resolvedName: string } {
  const { correct, closestKey } = judgeAnswer(input, correctName, ANSWER_FORMS);
  return { correct, resolvedName: closestKey ?? correctName };
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

import type { GameAnswer } from '../types';

export type LeaderboardEntry = {
  name: string;
  score: number;
  percentage: number;
  correctCount?: number;
  duration: number;
  date: string;
  region: string;
  gameLength: number;
  rank?: number;
};

/**
 * What the client POSTs at game end.
 * The server recalculates score and percentage from the answers array —
 * the client's in-game score display is for UX only and is never trusted.
 */
export type ScoreSubmission = {
  name: string;
  answers: GameAnswer[];
  gameLength: number;
  region: string;
  duration: number;
  /** Honeypot trap — always sent as empty string by legitimate clients. */
  honeypot?: string;
};

const API_BASE = '/api/leaderboard';

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    const data = await res.json();
    return data.leaderboard ?? [];
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    return [];
  }
}

export async function saveScore(submission: ScoreSubmission): Promise<void> {
  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...submission, honeypot: '' }),
    });
  } catch (err) {
    console.error('Leaderboard save error:', err);
    // Fail silently — don't crash the game if the leaderboard save fails
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

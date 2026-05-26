export type LeaderboardEntry = {
  name: string;
  score: number;
  percentage: number;
  duration: number;
  date: string;
  region: string;
  gameLength: number;
  rank?: number;
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

export async function saveScore(entry: Omit<LeaderboardEntry, 'rank'>): Promise<void> {
  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
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

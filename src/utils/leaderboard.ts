export type LeaderboardEntry = {
  name: string;
  score: number;
  percentage: number;
  duration: number;
  date: string;
  region: string;
  gameLength: number;
};

const KEY = 'flag_assurance_leaderboard';
const MAX = 10;

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveScore(entry: LeaderboardEntry): void {
  try {
    const updated = [...getLeaderboard(), entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — silently skip
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

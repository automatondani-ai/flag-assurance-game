/** Whether this browser has already finished or skipped the how-to-play tour. */

const STORAGE_KEY = 'flag_explorer_tour_seen';

// Also remembered in memory, so blocked storage doesn't mean a tour every game.
let seenThisVisit = false;

export function tourSeen(): boolean {
  if (seenThisVisit) return true;
  try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
}

export function markTourSeen(): void {
  seenThisVisit = true;
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* storage blocked */ }
}

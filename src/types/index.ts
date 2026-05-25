export type GamePhase = 'welcome' | 'playing' | 'results';

export type Continent = 'Africa' | 'Europe' | 'Americas' | 'Asia' | 'Oceania';

export interface Country {
  name: string;
  flag: string;
  code: string;
  continent: Continent;
  aliases?: string[];
}

export interface GameState {
  phase: GamePhase;
  playerName: string;
  score: number;
  correctCount: number;
  currentIndex: number;
  totalQuestions: number;
  lastDelta: number | null;
  lastCorrect: boolean | null;
  lastResolvedName: string | null;
  missedCountries: Country[];
  duration: number;
  region: string;
  gameLength: number;

  // ── Hint system ───────────────────────────────────────────────────────────
  /** How many hints have been used on the CURRENT round only. Resets to 0 each round. */
  hintsUsed: number;
  /** Progressive reveal string for the current round, e.g. "N i _ _ _ _ _". Cleared each round. */
  hintDisplay: string;
  /**
   * Global hint budget for the entire game. Starts at 7, decrements on each USE_HINT,
   * and NEVER resets mid-game — only on startGame / resetGame.
   */
  totalHintsRemaining: number;
}

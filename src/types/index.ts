export type GamePhase = 'welcome' | 'playing' | 'results';

export type Continent = 'Africa' | 'Europe' | 'Americas' | 'Asia' | 'Oceania';

export interface Country {
  name: string;
  flag: string;
  code: string;
  continent: Continent;
  aliases?: string[];
}

/**
 * One answered (or skipped) question recorded during a game session.
 * The full answers array is POSTed to the server at game end so the
 * server can verify and recalculate the score independently.
 */
export type GameAnswer = {
  countryCode: string;  // e.g. "ng"
  playerInput: string;  // what the player typed (empty string for skips)
  assurance: number;    // 0–100
  usedHint: boolean;
  skipped: boolean;
};

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

  // ── Answer log (sent to server for score verification) ────────────────────
  /** Accumulates one entry per question as the game progresses. */
  answers: GameAnswer[];

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

  // ── Persistence across sessions ───────────────────────────────────────────
  /** The name from the most recent game. Survives resetGame so the welcome screen can pre-fill it. */
  lastPlayerName: string;
}

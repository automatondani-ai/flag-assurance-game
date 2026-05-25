export type GamePhase = 'welcome' | 'playing' | 'results';

export interface Country {
  name: string;
  flag: string;
  code: string;
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
}

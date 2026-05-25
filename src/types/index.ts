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
}

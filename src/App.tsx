import { useState } from 'react';
import type { Continent } from './types';
import useGameState from './hooks/useGameState';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultsScreen from './components/ResultsScreen';

export default function App() {
  const { state, queue, startGame, submitAnswer, useHint, skipQuestion, restartGame, resetGame } = useGameState();

  // Remember the last-used settings so GameScreen can restart with the same params
  const [lastContinents, setLastContinents] = useState<Continent[]>([]);
  const [lastGameLength, setLastGameLength] = useState(25);

  function handleStart(name: string, continents: Continent[], length: number) {
    setLastContinents(continents);
    setLastGameLength(length);
    startGame(name, continents, length);
  }

  if (state.phase === 'welcome') {
    return <WelcomeScreen onStart={handleStart} />;
  }

  if (state.phase === 'playing') {
    const currentCountry = queue[state.currentIndex];
    if (!currentCountry) return null;
    return (
      <GameScreen
        state={state}
        currentCountry={currentCountry}
        onSubmit={submitAnswer}
        onHint={useHint}
        onSkip={skipQuestion}
        onRestart={restartGame}
        gameContinents={lastContinents}
        gameLength={lastGameLength}
      />
    );
  }

  return <ResultsScreen state={state} onReset={resetGame} />;
}

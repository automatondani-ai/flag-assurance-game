import useGameState from './hooks/useGameState';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultsScreen from './components/ResultsScreen';

export default function App() {
  const { state, queue, startGame, submitAnswer, useHint, resetGame } = useGameState();

  if (state.phase === 'welcome') {
    return <WelcomeScreen onStart={startGame} />;
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
      />
    );
  }

  return <ResultsScreen state={state} onReset={resetGame} />;
}

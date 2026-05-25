import { useState, useEffect, useMemo } from 'react';
import type { GameState } from '../types';
import { getPerformanceTier } from '../utils/gameUtils';
import { getLeaderboard } from '../utils/leaderboard';
import LeaderboardTable from './LeaderboardTable';

function wikiUrl(name: string) {
  return `https://en.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;
}

interface ResultsScreenProps {
  state: GameState;
  onReset: () => void;
}

export default function ResultsScreen({ state, onReset }: ResultsScreenProps) {
  const { message, percentage } = getPerformanceTier(state.correctCount, state.totalQuestions);
  const isPositive = state.score >= 0;
  const [showMissed, setShowMissed] = useState(false);

  // Read leaderboard once on mount (score was already saved before this component rendered).
  const leaderboard = useMemo(() => getLeaderboard(), []);
  const currentPlayerIndex = leaderboard.findIndex(
    e => e.name === state.playerName && e.score === state.score && e.percentage === percentage,
  );
  const isInTopTen = currentPlayerIndex !== -1;

  // Count-up: animates from 0 → actual score over 1.2s with ease-out cubic.
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const target = state.score;
    if (target === 0) return;

    const DURATION = 1200;
    const STEPS = 72; // ~60 fps
    const interval = DURATION / STEPS;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const t = step / STEPS;
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayScore(Math.round(target * eased));
      if (step >= STEPS) {
        setDisplayScore(target);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []); // intentionally runs once on mount

  return (
    <div className="min-h-screen bg-navy px-4 py-8">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-5xl mx-auto">
        {/* Header rule */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-gold opacity-30" />
          <span className="font-ibm text-gold text-xs tracking-[0.3em] opacity-50 uppercase">
            Mission Debrief
          </span>
          <div className="h-px flex-1 bg-gold opacity-30" />
        </div>

        {/* ── Two-column layout ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Main result card */}
            <div className="bg-navy-card border border-navy-border p-8 md:p-10 text-center relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold opacity-50" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gold opacity-50" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gold opacity-50" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold opacity-50" />

              {/* Player name */}
              <p className="font-ibm text-xs tracking-[0.3em] text-[#6b7a8d] uppercase mb-1">
                Commander
              </p>
              <h2 className="font-playfair text-2xl text-[#e8e0d0] mb-8">
                {state.playerName}
              </h2>

              <div className="h-px bg-navy-border mb-8" />

              {/* Animated score */}
              <p className="font-ibm text-xs tracking-[0.3em] text-[#6b7a8d] uppercase mb-2">
                Final Score
              </p>
              <div
                className={[
                  'font-ibm text-7xl font-semibold tabular-nums mb-2 leading-none',
                  isPositive ? 'text-gold' : 'text-red-400',
                ].join(' ')}
              >
                {displayScore >= 0 ? '+' : ''}
                {displayScore}
              </div>

              {/* Accuracy row */}
              <div className="flex items-center justify-center gap-3 mb-4 mt-4">
                <div className="h-px flex-1 bg-navy-border" />
                <span className="font-ibm text-sm text-[#9aa3b0] tabular-nums">
                  {percentage}% accuracy
                </span>
                <div className="h-px flex-1 bg-navy-border" />
              </div>

              {/* Accuracy fill bar */}
              <div className="w-full h-1.5 bg-navy-input border border-navy-border mb-8">
                <div
                  className="h-full bg-gold transition-all duration-700"
                  style={{ width: `${Math.max(0, percentage)}%` }}
                />
              </div>

              {/* Tier message */}
              <div className="border border-gold border-opacity-30 bg-navy-input px-6 py-4 mb-8">
                <p className="font-playfair text-lg text-[#e8e0d0] italic leading-snug">
                  "{message}"
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy-input border border-navy-border px-3 py-3">
                  <p className="font-ibm text-[9px] tracking-[0.2em] text-[#4a5568] uppercase mb-1">
                    Rounds
                  </p>
                  <p className="font-ibm text-xl text-[#e8e0d0] tabular-nums">
                    {state.totalQuestions}
                  </p>
                </div>
                <div className="bg-navy-input border border-navy-border px-3 py-3">
                  <p className="font-ibm text-[9px] tracking-[0.2em] text-[#4a5568] uppercase mb-1">
                    Correct
                  </p>
                  <p className="font-ibm text-xl text-emerald-400 tabular-nums">
                    {state.correctCount}
                  </p>
                </div>
                <div className="bg-navy-input border border-navy-border px-3 py-3">
                  <p className="font-ibm text-[9px] tracking-[0.2em] text-[#4a5568] uppercase mb-1">
                    Per Round
                  </p>
                  <p
                    className={[
                      'font-ibm text-xl tabular-nums',
                      isPositive ? 'text-[#e8e0d0]' : 'text-red-400',
                    ].join(' ')}
                  >
                    {state.totalQuestions > 0
                      ? (state.score / state.totalQuestions).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
              </div>
            </div>

            {/* Missed countries */}
            <div className="bg-navy-card border border-navy-border">
              <button
                onClick={() => setShowMissed(v => !v)}
                className="w-full font-ibm text-xs tracking-[0.2em] uppercase px-6 py-4 text-left flex items-center justify-between text-[#6b7a8d] hover:text-gold transition-colors duration-150"
              >
                <span>Countries You Missed</span>
                <span>{showMissed ? 'Hide ▲' : 'Show Missed Flags ▼'}</span>
              </button>

              {showMissed && (
                <div className="border-t border-navy-border px-6 pb-6 pt-4">
                  {state.missedCountries.length === 0 ? (
                    <p className="font-ibm text-sm text-[#9aa3b0] text-center py-4">
                      🏆 Perfect score! No missed flags.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {state.missedCountries.map(country => (
                        <div
                          key={country.code}
                          className="bg-navy-input border border-navy-border p-3 hover:border-gold transition-colors duration-150"
                        >
                          <div className="bg-white flex items-center justify-center h-12 mb-2">
                            <img
                              src={country.flag}
                              alt={country.name}
                              className="h-12 w-full object-contain"
                            />
                          </div>
                          <p className="font-ibm text-xs font-semibold text-[#e8e0d0] mb-1 leading-snug">
                            {country.name}
                          </p>
                          <a
                            href={wikiUrl(country.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-ibm text-[10px] text-gold opacity-70 hover:opacity-100 transition-opacity"
                          >
                            Learn more →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Start Again */}
            <button
              onClick={onReset}
              className="w-full font-ibm text-sm tracking-[0.25em] uppercase py-3 px-6 bg-gold text-navy font-semibold hover:bg-[#e0b862] transition-colors duration-200 cursor-pointer"
            >
              Start Again
            </button>
          </div>

          {/* ── RIGHT COLUMN — sticky leaderboard sidebar ───────────────── */}
          <div className="md:sticky md:top-4 self-start">
            <div className="bg-navy-card border border-navy-border">
              <div className="px-4 py-3 border-b border-navy-border flex items-center gap-2">
                <span className="font-ibm text-xs tracking-[0.2em] uppercase text-[#6b7a8d]">
                  🏆 Global Top 10
                </span>
              </div>
              <LeaderboardTable
                entries={leaderboard}
                highlightIndex={isInTopTen ? currentPlayerIndex : undefined}
                currentEntry={
                  !isInTopTen
                    ? {
                        name: state.playerName,
                        score: state.score,
                        percentage,
                        duration: state.duration,
                        region: state.region,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>

        {/* Footer rule */}
        <div className="flex items-center gap-3 mt-8">
          <div className="h-px flex-1 bg-navy-border" />
          <span className="font-ibm text-[#2e3a4a] text-xs tracking-widest">◆</span>
          <div className="h-px flex-1 bg-navy-border" />
        </div>
      </div>
    </div>
  );
}

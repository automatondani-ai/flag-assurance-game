import { useState, useEffect, useMemo } from 'react';
import type { GameState } from '../types';
import { getPerformanceTier } from '../utils/gameUtils';
import { getLeaderboard, formatDuration } from '../utils/leaderboard';

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

  // Read leaderboard once on mount (it was saved before this component rendered).
  const leaderboard = useMemo(() => getLeaderboard(), []);
  const currentPlayerIndex = leaderboard.findIndex(
    e => e.name === state.playerName && e.score === state.score && e.percentage === percentage,
  );
  const isInTopTen = currentPlayerIndex !== -1;

  // Count-up: animates from 0 → actual score over 1.2s with ease-out cubic
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const target = state.score;
    if (target === 0) return;

    const DURATION = 1200;
    const STEPS = 72; // ~60fps
    const interval = DURATION / STEPS;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // ease-out cubic: progress decelerates toward the end
      const t = step / STEPS;
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * eased));
      if (step >= STEPS) {
        setDisplayScore(target);
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []); // intentionally runs once on mount

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Header rule */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-gold opacity-30" />
          <span className="font-ibm text-gold text-xs tracking-[0.3em] opacity-50 uppercase">
            Mission Debrief
          </span>
          <div className="h-px flex-1 bg-gold opacity-30" />
        </div>

        {/* Main card */}
        <div className="bg-navy-card border border-navy-border p-10 text-center relative">
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
            {/* Sign always shown; displayScore is always positive-magnitude during count-up */}
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
          <div className="border border-gold border-opacity-30 bg-navy-input px-6 py-4 mb-10">
            <p className="font-playfair text-lg text-[#e8e0d0] italic leading-snug">
              "{message}"
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-10">
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

          <button
            onClick={onReset}
            className="w-full font-ibm text-sm tracking-[0.25em] uppercase py-3 px-6 bg-gold text-navy font-semibold hover:bg-[#e0b862] transition-colors duration-200 cursor-pointer"
          >
            Start Again
          </button>
        </div>

        {/* Missed countries */}
        <div className="mt-4 bg-navy-card border border-navy-border">
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

        {/* Leaderboard */}
        <div className="mt-4 bg-navy-card border border-navy-border">
          <div className="px-6 py-3 border-b border-navy-border">
            <span className="font-ibm text-xs tracking-[0.2em] uppercase text-[#6b7a8d]">
              🏆 Global Top 10
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <p className="font-ibm text-xs text-[#4a5568] text-center py-6">No scores recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-ibm text-[11px]">
                <thead>
                  <tr className="border-b border-navy-border text-[#4a5568] tracking-[0.08em] uppercase">
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">Acc</th>
                    <th className="px-3 py-2 text-right">Time</th>
                    <th className="px-3 py-2 text-left">Region</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => {
                    const isCurrent = i === currentPlayerIndex;
                    return (
                      <tr
                        key={i}
                        className={[
                          'border-b border-navy-border/40',
                          isCurrent
                            ? 'bg-gold/10 text-gold'
                            : 'text-[#9aa3b0] hover:bg-navy-input',
                        ].join(' ')}
                      >
                        <td className="px-3 py-2 text-[#4a5568]">#{i + 1}</td>
                        <td className="px-3 py-2 font-semibold max-w-[100px] truncate">{entry.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {entry.score >= 0 ? '+' : ''}{entry.score}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{entry.percentage}%</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatDuration(entry.duration)}</td>
                        <td className="px-3 py-2 text-[#6b7a8d] max-w-[80px] truncate">{entry.region}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isInTopTen && (
            <div className="border-t border-navy-border px-4 py-3">
              <p className="font-ibm text-[10px] tracking-[0.15em] uppercase text-[#4a5568] mb-2">
                Your Result
              </p>
              <div className="bg-navy-input border border-navy-border px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-ibm text-[11px] text-[#9aa3b0]">
                <span className="font-semibold text-[#e8e0d0]">{state.playerName}</span>
                <span className="tabular-nums">{state.score >= 0 ? '+' : ''}{state.score}</span>
                <span className="tabular-nums">{percentage}%</span>
                <span className="tabular-nums">{formatDuration(state.duration)}</span>
                <span className="text-[#6b7a8d]">{state.region}</span>
              </div>
            </div>
          )}
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

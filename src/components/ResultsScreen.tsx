import { useState, useEffect } from 'react';
import type { GameState } from '../types';
import { getPerformanceTier } from '../utils/gameUtils';
import { getLeaderboard, saveScore, type LeaderboardEntry } from '../utils/leaderboard';
import LeaderboardTable from './LeaderboardTable';

function wikiUrl(name: string) {
  return `https://en.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;
}

interface ResultsScreenProps {
  state: GameState;
  onReset: () => void;
}

// ── Loading skeleton — 3 pulsing rows ─────────────────────────────────────────
function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <p className="font-nunito text-sm text-center" style={{ color: 'rgba(27,58,107,0.4)' }}>
        Loading scores...
      </p>
      {[0, 1, 2].map(i => (
        <div key={i} className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(27,58,107,0.12)' }} />
      ))}
    </div>
  );
}

export default function ResultsScreen({ state, onReset }: ResultsScreenProps) {
  const { message, percentage } = getPerformanceTier(state.correctCount, state.totalQuestions);
  const isPositive  = state.score >= 0;
  const [showMissed, setShowMissed] = useState(false);

  // ── Global leaderboard — save then refresh ─────────────────────────────────
  const [leaderboard, setLeaderboard]         = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    // Build the entry from the finished game's state
    const entry: Omit<LeaderboardEntry, 'rank'> = {
      name:       state.playerName,
      score:      state.score,
      percentage,
      duration:   state.duration,
      date:       new Date().toISOString(),
      region:     state.region,
      gameLength: state.gameLength,
    };
    setLeaderboardLoading(true);
    // POST the score, then immediately GET the refreshed board so the player
    // sees their own result ranked correctly.
    saveScore(entry).then(() =>
      getLeaderboard().then(data => {
        setLeaderboard(data);
        setLeaderboardLoading(false);
      }),
    );
  }, []); // runs once on results-screen mount

  const currentPlayerIndex = leaderboard.findIndex(
    e => e.name === state.playerName && e.score === state.score && e.percentage === percentage,
  );
  const isInTopTen = currentPlayerIndex !== -1;

  // ── Count-up animation 0 → final score over 1.2s (ease-out cubic) ──────────
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const target = state.score;
    if (target === 0) return;
    const DURATION = 1200;
    const STEPS    = 72;
    const interval = DURATION / STEPS;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t     = step / STEPS;
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * eased));
      if (step >= STEPS) { setDisplayScore(target); clearInterval(timer); }
    }, interval);
    return () => clearInterval(timer);
  }, []); // intentionally once on mount

  const deco = (
    pos: { top?: string; left?: string; right?: string; bottom?: string },
    rot = '0deg',
    size = '2.5rem',
  ) => ({
    position: 'absolute' as const,
    ...pos,
    fontSize: size,
    transform: `rotate(${rot})`,
    opacity: 0.85,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    zIndex: 1,
    lineHeight: 1,
  });

  return (
    <div className="phase-enter min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-coral)' }}>
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Circle wrapper */}
            <div className="relative flex justify-center">
              {/* Decorative emojis */}
              <span style={deco({ top: '-20px', left: '-12px' }, '-15deg', '2.5rem')}>🎈</span>
              <span style={deco({ top: '-14px', right: '32px' }, '12deg', '2rem')}>🎉</span>
              <span style={deco({ top: '25%', left: '-20px' }, '-10deg', '2rem')}>🌟</span>
              <span style={deco({ bottom: '-16px', right: '-14px' }, '15deg', '2.5rem')}>✈️</span>
              <span style={deco({ bottom: '18px', left: '-18px' }, '-8deg', '2rem')}>🗺️</span>
              <span style={deco({ top: '40%', right: '-18px' }, '10deg', '2rem')}>🎯</span>

              {/* Circle */}
              <div
                className="circle-stage w-full text-center"
                style={{
                  maxWidth: '520px',
                  paddingTop: '3.5rem',
                  paddingBottom: '3rem',
                  paddingLeft: '2rem',
                  paddingRight: '2rem',
                  gap: '0.6rem',
                }}
              >
                {/* Trophy / sad face */}
                <div className="text-[4rem] select-none leading-none">
                  {state.score > 0 ? '🏆' : '😅'}
                </div>

                {/* Player name */}
                <p className="font-fredoka text-2xl" style={{ color: 'var(--color-navy-text)' }}>
                  {state.playerName}
                </p>

                {/* Animated score */}
                <p
                  className="font-fredoka tabular-nums leading-none"
                  style={{
                    fontSize: '4.5rem',
                    color: isPositive ? '#d97706' : 'var(--color-bg-coral)',
                    lineHeight: 1,
                  }}
                >
                  {displayScore >= 0 ? '+' : ''}{displayScore}
                </p>

                {/* Accuracy bar + percentage */}
                <div style={{ width: '100%', maxWidth: '260px' }}>
                  <p className="font-fredoka text-xl mb-1" style={{ color: 'rgba(27,58,107,0.65)' }}>
                    {percentage}% accuracy
                  </p>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'rgba(27,58,107,0.12)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(0, percentage)}%`, background: 'var(--color-gold)' }}
                    />
                  </div>
                </div>

                {/* Tier message */}
                <p
                  className="font-nunito font-bold text-base italic text-center"
                  style={{ color: 'rgba(27,58,107,0.7)', maxWidth: '280px' }}
                >
                  "{message}"
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div
              className="grid grid-cols-3 gap-3 mx-auto"
              style={{ maxWidth: '520px' }}
            >
              {[
                { label: 'Rounds',    value: String(state.totalQuestions),  accent: 'var(--color-cream)' },
                { label: 'Correct',   value: String(state.correctCount),    accent: '#6ee7b7' },
                { label: 'Per Round', value: state.totalQuestions > 0 ? (state.score / state.totalQuestions).toFixed(1) : '0.0', accent: isPositive ? 'var(--color-cream)' : '#fca5a5' },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(255,255,255,0.18)' }}
                >
                  <p className="font-nunito text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(255,248,240,0.55)' }}>
                    {label}
                  </p>
                  <p className="font-fredoka text-2xl" style={{ color: accent }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Missed countries */}
            <div
              className="rounded-3xl overflow-hidden mx-auto"
              style={{ maxWidth: '520px', background: 'rgba(255,255,255,0.18)' }}
            >
              <button
                onClick={() => setShowMissed(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4"
                style={{ color: 'var(--color-cream)', cursor: 'pointer' }}
              >
                <span className="font-fredoka text-base">
                  Countries You Missed ({state.missedCountries.length})
                </span>
                <span
                  className="font-fredoka text-lg transition-transform duration-200 inline-block"
                  style={{ transform: showMissed ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </span>
              </button>

              {showMissed && (
                <div className="px-6 pb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  {state.missedCountries.length === 0 ? (
                    <p
                      className="font-fredoka text-xl text-center py-4"
                      style={{ color: 'var(--color-gold)' }}
                    >
                      🎉 Perfect Score! No flags missed.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {state.missedCountries.map(country => (
                        <div
                          key={country.code}
                          className="rounded-2xl overflow-hidden"
                          style={{ background: 'var(--color-cream)' }}
                        >
                          <div className="bg-white flex items-center justify-center h-12 p-1">
                            <img
                              src={country.flag}
                              alt={country.name}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="p-2">
                            <p
                              className="font-fredoka text-sm leading-snug"
                              style={{ color: 'var(--color-navy-text)' }}
                            >
                              {country.name}
                            </p>
                            <a
                              href={wikiUrl(country.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-nunito text-xs"
                              style={{ color: 'var(--color-gold)' }}
                            >
                              Learn more →
                            </a>
                          </div>
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
              className="btn-navy w-full py-4 text-xl uppercase tracking-wide block mx-auto"
              style={{ maxWidth: '520px' }}
            >
              Start Again
            </button>
          </div>

          {/* ── RIGHT COLUMN — global leaderboard ───────────────────── */}
          <div className="md:sticky md:top-6 self-start">
            <p className="font-fredoka text-xl mb-3" style={{ color: 'var(--color-cream)' }}>
              🏆 GLOBAL TOP 10
            </p>
            <div
              className="rounded-3xl p-4"
              style={{ background: 'var(--color-cream)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            >
              {leaderboardLoading ? (
                <LeaderboardSkeleton />
              ) : (
                <LeaderboardTable
                  entries={leaderboard}
                  highlightIndex={isInTopTen ? currentPlayerIndex : undefined}
                  currentEntry={
                    !isInTopTen
                      ? {
                          name:       state.playerName,
                          score:      state.score,
                          percentage,
                          duration:   state.duration,
                          region:     state.region,
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

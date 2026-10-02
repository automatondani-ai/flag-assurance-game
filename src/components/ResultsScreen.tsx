import { useState, useEffect } from 'react';
import type { GameState } from '../types';
import { getPerformanceTier } from '../utils/gameUtils';
import { getLeaderboard, saveScore, type LeaderboardEntry, type ScoreSubmission } from '../utils/leaderboard';
import LeaderboardTable from './LeaderboardTable';

function wikiUrl(name: string) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`;
}

const KOFI_URL = 'https://ko-fi.com/damilolaoyetayo';

function CupIcon() {
  return (
    <svg className="inline-block align-[-3px] mr-1.5" width="17" height="17" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
         strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5z" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 2.8c0 1.3 1.2 1.3 1.2 2.6M12 2.8c0 1.3 1.2 1.3 1.2 2.6" />
    </svg>
  );
}

interface ResultsScreenProps {
  state: GameState;
  onReset: () => void;
}

// ── Loading skeleton — 3 pulsing rows ─────────────────────────────────────────
function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <p className="font-body text-sm text-center" style={{ color: 'rgba(11,42,74,0.4)' }}>
        Loading scores...
      </p>
      {[0, 1, 2].map(i => (
        <div key={i} className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(11,42,74,0.12)' }} />
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
    // Build the submission — server recalculates score from answers independently.
    // The client's state.score is used only for the on-screen display, not storage.
    const submission: ScoreSubmission = {
      name:       state.playerName,
      answers:    state.answers,
      gameLength: state.gameLength,
      region:     state.region,
      duration:   state.duration,
    };
    setLeaderboardLoading(true);
    // POST answers, then immediately GET the refreshed board so the player
    // sees their server-verified result ranked correctly.
    saveScore(submission).then(() =>
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

  return (
    /* Screen background — decorative emojis live here */
    <div
      className="phase-enter screen px-4 py-10 relative overflow-x-hidden"
      style={{ background: 'var(--color-navy)' }}
    >
      {/* Decorative emojis — 2 on mobile, more on larger screens */}
      <span className="pointer-events-none select-none"
            style={{ position: 'absolute', top: '24px', left: '14px', fontSize: '2.5rem', transform: 'rotate(-15deg)', opacity: 0.22, zIndex: 0 }}>
        🎈
      </span>
      <span className="pointer-events-none select-none"
            style={{ position: 'absolute', top: '30px', right: '20px', fontSize: '2rem', transform: 'rotate(12deg)', opacity: 0.22, zIndex: 0 }}>
        🎉
      </span>
      <span className="hidden sm:block pointer-events-none select-none"
            style={{ position: 'absolute', top: '30%', left: '12px', fontSize: '2rem', transform: 'rotate(-10deg)', opacity: 0.16, zIndex: 0 }}>
        🌟
      </span>
      <span className="hidden sm:block pointer-events-none select-none"
            style={{ position: 'absolute', bottom: '80px', right: '16px', fontSize: '2.5rem', transform: 'rotate(15deg)', opacity: 0.16, zIndex: 0 }}>
        ✈️
      </span>
      <span className="hidden lg:block pointer-events-none select-none"
            style={{ position: 'absolute', bottom: '100px', left: '16px', fontSize: '2rem', transform: 'rotate(-8deg)', opacity: 0.14, zIndex: 0 }}>
        🗺️
      </span>
      <span className="hidden lg:block pointer-events-none select-none"
            style={{ position: 'absolute', top: '45%', right: '14px', fontSize: '2rem', transform: 'rotate(10deg)', opacity: 0.14, zIndex: 0 }}>
        🎯
      </span>

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Results card — overflow:visible so it can grow as needed */}
            <div
              className="card-stage text-center"
              style={{ overflow: 'visible' }}
            >
              {/* Trophy / sad face */}
              <div className="text-[4rem] select-none leading-none">
                {state.score > 0 ? '🏆' : '😅'}
              </div>

              {/* Player name */}
              <p className="font-heading text-2xl" style={{ color: 'var(--color-ink)' }}>
                {state.playerName}
              </p>

              {/* Animated score */}
              <p
                className="font-heading tabular-nums leading-none"
                style={{
                  fontSize: '4.5rem',
                  color: isPositive ? 'var(--color-teal-ink)' : 'var(--color-coral-ink)',
                  lineHeight: 1,
                }}
              >
                {displayScore >= 0 ? '+' : ''}{displayScore}
              </p>

              {/* Accuracy bar + percentage */}
              <div style={{ width: '100%', maxWidth: '260px' }}>
                <p className="font-heading text-xl mb-1" style={{ color: 'rgba(11,42,74,0.65)' }}>
                  {percentage}% accuracy
                </p>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(11,42,74,0.12)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(0, percentage)}%`, background: 'var(--color-teal)' }}
                  />
                </div>
              </div>

              {/* Tier message */}
              <p
                className="font-body font-bold text-base italic text-center"
                style={{ color: 'rgba(11,42,74,0.7)', maxWidth: '280px' }}
              >
                "{message}"
              </p>
            </div>

            {/* Stats row */}
            <div
              className="grid grid-cols-3 gap-3 mx-auto"
              style={{ maxWidth: '520px' }}
            >
              {[
                { label: 'Rounds',    value: String(state.totalQuestions),  accent: 'var(--color-paper)' },
                { label: 'Correct',   value: String(state.correctCount),    accent: 'var(--color-teal)' },
                { label: 'Per Round', value: state.totalQuestions > 0 ? (state.score / state.totalQuestions).toFixed(1) : '0.0', accent: isPositive ? 'var(--color-paper)' : '#fca5a5' },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <p className="font-body text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {label}
                  </p>
                  <p className="font-heading text-2xl" style={{ color: accent }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Missed countries */}
            <div
              className="rounded-3xl overflow-hidden mx-auto"
              style={{ maxWidth: '520px', background: 'rgba(255,255,255,0.08)' }}
            >
              <button
                onClick={() => setShowMissed(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4"
                style={{ color: 'var(--color-paper)', cursor: 'pointer' }}
              >
                <span className="font-heading text-base">
                  Countries You Missed ({state.missedCountries.length})
                </span>
                <span
                  className="font-heading text-lg transition-transform duration-200 inline-block"
                  style={{ transform: showMissed ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </span>
              </button>

              {showMissed && (
                <div className="px-6 pb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  {state.missedCountries.length === 0 ? (
                    <p
                      className="font-heading text-xl text-center py-4"
                      style={{ color: 'var(--color-teal)' }}
                    >
                      🎉 Perfect Score! No flags missed.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {state.missedCountries.map(country => (
                        <div
                          key={country.code}
                          className="rounded-2xl overflow-hidden"
                          style={{ background: 'var(--color-paper)' }}
                        >
                          <div className="bg-white flex items-center justify-center h-12 p-1">
                            <img
                              src={country.flag}
                              alt={country.name}
                              className="flag-img h-full w-full object-contain"
                            />
                          </div>
                          <div className="p-2">
                            <p
                              className="font-heading text-sm leading-snug"
                              style={{ color: 'var(--color-ink)' }}
                            >
                              {country.name}
                            </p>
                            <a
                              href={wikiUrl(country.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-body text-xs"
                              style={{ color: 'var(--color-teal-ink)' }}
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
              className="btn-primary w-full py-4 text-xl uppercase tracking-wide block mx-auto"
              style={{ maxWidth: '520px' }}
            >
              Start Again
            </button>

            {/* One quiet Ko-fi ask, only once the game is over (new tab, so the results stay) */}
            <p
              className="font-body text-center text-[15px]"
              style={{ color: 'rgba(255,255,255,0.72)', marginTop: '14px' }}
            >
              Enjoyed the game?{' '}
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold whitespace-nowrap underline decoration-2 underline-offset-4"
                style={{ color: 'var(--color-paper)', textDecorationColor: 'var(--color-teal)' }}
              >
                <CupIcon />Buy me a coffee
              </a>
            </p>
          </div>

          {/* ── RIGHT COLUMN — global leaderboard ───────────────────── */}
          <div className="lg:sticky lg:top-[76px] self-start">
            <p className="font-heading text-xl mb-3" style={{ color: 'var(--color-paper)' }}>
              🏆 GLOBAL TOP 10
            </p>
            {/* card-stage; overflow:visible so table rows never clip */}
            <div
              className="card-stage"
              style={{ overflow: 'visible', alignItems: 'stretch', padding: '16px' }}
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

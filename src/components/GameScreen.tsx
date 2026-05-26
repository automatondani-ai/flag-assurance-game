import { useState, useEffect, useRef } from 'react';
import type { GameState, Country, Continent } from '../types';
import AssuranceSlider from './AssuranceSlider';
import HintDisplay from './HintDisplay';

interface GameScreenProps {
  state: GameState;
  currentCountry: Country;
  onSubmit: (input: string, assurance: number) => void;
  onHint: () => void;
  onSkip: () => void;
  onRestart: (continents: Continent[], length: number) => void;
  gameContinents: Continent[];
  gameLength: number;
}

export default function GameScreen({
  state,
  currentCountry,
  onSubmit,
  onHint,
  onSkip,
  onRestart,
  gameContinents,
  gameLength,
}: GameScreenProps) {
  const [input, setInput] = useState('');
  const [assurance, setAssurance] = useState(0);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput('');
    setAssurance(0);
    inputRef.current?.focus();
  }, [state.currentIndex]);

  const isFeedbackVisible = state.lastCorrect !== null;
  const canSubmit = input.trim().length > 0 && !isFeedbackVisible;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(input, assurance);
  }

  function handleConfirmRestart() {
    setShowRestartModal(false);
    onRestart(gameContinents, gameLength);
  }

  const round       = state.currentIndex + 1;
  const progressPct = state.totalQuestions > 0
    ? (state.currentIndex / state.totalQuestions) * 100
    : 0;

  const deco = (
    pos: { top?: string; left?: string; right?: string; bottom?: string },
    rot = '0deg',
    size = '2.5rem',
  ) => ({
    position: 'absolute' as const,
    ...pos,
    fontSize: size,
    transform: `rotate(${rot})`,
    opacity: 0.7,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    zIndex: 1,
    lineHeight: 1,
  });

  return (
    <div className="phase-enter min-h-screen px-4 py-8" style={{ background: 'var(--color-bg-navy)' }}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1" style={{ background: 'rgba(240,192,64,0.25)' }} />
          <span className="font-fredoka text-sm tracking-widest uppercase" style={{ color: 'rgba(255,248,240,0.4)' }}>
            Flag Explorer
          </span>
          <div className="h-px flex-1" style={{ background: 'rgba(240,192,64,0.25)' }} />
        </div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: 'var(--color-gold)' }}
          />
        </div>
      </div>

      {/* ── Mobile top bar — player / score / round (hidden on lg+) ── */}
      <div className="lg:hidden w-full max-w-5xl mx-auto mb-4">
        <div
          className="flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        >
          <div>
            <div className="font-nunito text-xs uppercase tracking-widest" style={{ color: 'rgba(255,248,240,0.6)' }}>
              COMMANDER
            </div>
            <div className="font-fredoka text-lg truncate" style={{ color: 'var(--color-cream)', maxWidth: '120px' }}>
              {state.playerName}
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-fredoka text-2xl tabular-nums"
              style={{ color: state.score >= 0 ? 'var(--color-gold)' : '#f87171' }}
            >
              {state.score >= 0 ? '+' : ''}{state.score}
            </div>
            <div className="font-nunito text-xs" style={{ color: 'rgba(255,248,240,0.6)' }}>
              Round {round} of {state.totalQuestions}
            </div>
          </div>
          <button
            onClick={() => setShowRestartModal(true)}
            className="font-fredoka text-sm rounded-full px-3 py-1 border"
            style={{ borderColor: 'rgba(255,248,240,0.30)', color: 'rgba(255,248,240,0.70)', background: 'transparent', cursor: 'pointer' }}
          >
            ↺
          </button>
        </div>
      </div>

      {/* ── Two-column layout ──────────────────────────────────────── */}
      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6 items-start">

        {/* ── LEFT PANEL ──────────────────────────────────────────── */}
        <div>
          <div className="relative flex justify-center">
            {/* Decorative emojis */}
            <span style={deco({ top: '-18px', left: '16px' }, '-12deg', '2.5rem')}>🌍</span>
            <span style={deco({ top: '-20px', right: '28px' }, '10deg', '2rem')}>✈️</span>
            <span style={deco({ bottom: '-12px', left: '8px' }, '-8deg', '2rem')}>🎯</span>
            <span style={deco({ bottom: '-18px', right: '18px' }, '15deg', '2rem')}>🌟</span>

            {/* ── Circle — overflow:hidden clips flag to the boundary ── */}
            <div
              style={{
                width: 'min(480px, 88vw)',
                borderRadius: '999px',
                background: 'var(--color-cream)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 'clamp(16px, 4vw, 28px)',
                gap: '10px',
                overflow: 'hidden',
                position: 'relative',
                margin: '0 auto',
              }}
            >
              {/* FLAG ZONE */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  flexShrink: 0,
                  background: '#fff',
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={currentCountry.flag}
                  alt="Flag"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>

              {/* HINT DISPLAY — only visible when hintsUsed > 0 */}
              {state.hintsUsed > 0 && (
                <HintDisplay hintDisplay={state.hintDisplay} hintsUsed={state.hintsUsed} />
              )}

              {/* ANSWER INPUT */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                disabled={isFeedbackVisible}
                placeholder="Country name..."
                className="pill-input"
                style={{ width: '100%', opacity: isFeedbackVisible ? 0.5 : 1 }}
              />

              {/* HEARTS + BUTTONS ROW */}
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                {/* Hearts row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontSize: '11px', color: '#888', marginRight: '6px', fontFamily: 'Nunito' }}>
                    HINTS
                  </span>
                  {Array.from({ length: 7 }, (_, i) => (
                    <svg key={i} viewBox="0 0 24 24"
                         style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                      <path
                        d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791
                           3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457
                           1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621
                           5.274 5.181 0 4.069-5.136 8.625-11 14.402z"
                        fill={i < state.totalHintsRemaining ? '#ef4444' : 'none'}
                        stroke="#ef4444"
                        strokeWidth={i < state.totalHintsRemaining ? '0' : '1.5'}
                      />
                    </svg>
                  ))}
                </div>

                {/* Hint + Skip buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={onHint}
                    disabled={state.totalHintsRemaining === 0}
                    className="btn-outlined-gold"
                    style={{ fontSize: '13px', padding: '6px 16px' }}
                  >
                    💡 Hint
                  </button>
                  <button
                    onClick={onSkip}
                    className="btn-outlined-coral"
                    style={{ fontSize: '13px', padding: '6px 16px' }}
                  >
                    ⏭ Skip
                  </button>
                </div>
              </div>

              {/* FEEDBACK — shows briefly after submit */}
              {isFeedbackVisible && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Fredoka One', fontSize: '16px' }}>
                    {state.lastCorrect
                      ? <span style={{ color: '#4ade80' }}>
                          {state.lastResolvedName !== null &&
                           state.lastResolvedName.toLowerCase() !== input.trim().toLowerCase()
                            ? `✓ Correct! (matched: ${state.lastResolvedName})`
                            : '✓ Correct, Good Job!'}
                        </span>
                      : <span style={{ color: '#E8635A' }}>
                          ✗ Wrong — it was {currentCountry.name}
                        </span>
                    }
                  </div>
                  {state.lastDelta !== null && (
                    <div
                      key={`delta-${state.currentIndex}`}
                      className="animate-delta-pop"
                      style={{
                        fontFamily: 'Fredoka One',
                        fontSize: '24px',
                        color: state.lastDelta >= 0 ? 'var(--color-gold)' : '#f87171',
                        marginTop: '4px',
                      }}
                    >
                      {state.lastDelta >= 0 ? '+' : ''}{state.lastDelta}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Below-circle controls ─────────────────────────────── */}
          <div className="mt-6 mx-auto space-y-4" style={{ maxWidth: 'min(480px, 88vw)' }}>
            <AssuranceSlider value={assurance} onChange={setAssurance} />

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={[
                'btn-gold w-full py-5 lg:py-4 text-xl uppercase tracking-wide',
                canSubmit ? 'animate-btn-pulse' : '',
              ].join(' ')}
              style={{ opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
            >
              Submit
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL — score sidebar (desktop only) ───────────── */}
        <div className="hidden lg:block lg:sticky lg:top-6 self-start">
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div>
              <p className="font-nunito text-xs uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,248,240,0.38)' }}>
                Commander
              </p>
              <p className="font-fredoka text-xl truncate" style={{ color: 'var(--color-cream)' }}>
                {state.playerName}
              </p>
            </div>

            <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div>
              <p className="font-fredoka text-sm uppercase" style={{ color: 'rgba(255,248,240,0.45)' }}>Score</p>
              <p
                className="font-fredoka tabular-nums leading-none"
                style={{ fontSize: '3.25rem', color: state.score >= 0 ? 'var(--color-gold)' : '#f87171' }}
              >
                {state.score >= 0 ? '+' : ''}{state.score}
              </p>
            </div>

            <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div>
              <p className="font-nunito text-sm" style={{ color: 'rgba(255,248,240,0.6)' }}>
                Round{' '}
                <span className="font-nunito font-bold" style={{ color: 'var(--color-cream)' }}>{round}</span>
                {' '}of {state.totalQuestions}
              </p>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: 'var(--color-gold)' }}
                />
              </div>
            </div>

            <button
              onClick={() => setShowRestartModal(true)}
              className="w-full font-fredoka text-sm py-2 px-4 rounded-full border-2 transition-colors duration-150"
              style={{ borderColor: 'var(--color-cream)', color: 'var(--color-cream)', background: 'transparent', cursor: 'pointer' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-cream)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-navy-text)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-cream)';
              }}
            >
              ↺ Restart
            </button>

            <div className="flex justify-between text-xl" style={{ opacity: 0.18 }}>
              <span>🗺️</span>
              <span>🧭</span>
            </div>

            <p className="font-nunito text-xs leading-relaxed" style={{ color: 'rgba(255,248,240,0.28)' }}>
              Higher confidence = higher reward or penalty. Score can go negative.
            </p>
          </div>
        </div>

      </div>

      {/* ── Restart confirmation modal ──────────────────────────────── */}
      {showRestartModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowRestartModal(false)}
        >
          <div
            className="rounded-2xl p-6 shadow-xl mx-4"
            style={{ background: 'var(--color-cream)', maxWidth: '320px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <h2
              className="font-fredoka text-xl mb-2"
              style={{ color: 'var(--color-navy-text)' }}
            >
              Restart Game?
            </h2>
            <p
              className="font-nunito text-sm mb-6"
              style={{ color: 'rgba(27,58,107,0.7)' }}
            >
              Your current progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestartModal(false)}
                className="flex-1 font-fredoka py-2 rounded-full border-2 transition-colors duration-150"
                style={{ borderColor: 'var(--color-navy-text)', color: 'var(--color-navy-text)', background: 'transparent' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestart}
                className="flex-1 font-fredoka py-2 rounded-full border-none transition-colors duration-150"
                style={{ background: 'var(--color-gold)', color: 'var(--color-navy-text)', cursor: 'pointer' }}
              >
                Restart 🔄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

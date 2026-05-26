import { useState, useEffect, useRef } from 'react';
import type { GameState, Country, Continent } from '../types';
import AssuranceSlider from './AssuranceSlider';
import HintHearts from './HintHearts';
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

  const [loadedCode, setLoadedCode] = useState<string | null>(null);
  const imgLoaded = loadedCode === currentCountry.code;

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
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

      {/* ── Two-column layout ──────────────────────────────────────── */}
      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-6 items-start">

        {/* ── LEFT PANEL ──────────────────────────────────────────── */}
        <div>
          <div className="relative flex justify-center">
            {/* Decorative emojis */}
            <span style={deco({ top: '-18px', left: '16px' }, '-12deg', '2.5rem')}>🌍</span>
            <span style={deco({ top: '-20px', right: '28px' }, '10deg', '2rem')}>✈️</span>
            <span style={deco({ bottom: '-12px', left: '8px' }, '-8deg', '2rem')}>🎯</span>
            <span style={deco({ bottom: '-18px', right: '18px' }, '15deg', '2rem')}>🌟</span>

            {/* Circle stage */}
            <div
              className="circle-stage w-full"
              style={{
                maxWidth: '520px',
                paddingTop: '4rem',
                paddingBottom: '1.5rem',
                paddingLeft: '2rem',
                paddingRight: '2rem',
                gap: '0.75rem',
              }}
            >
              {/* ── FIX 1: Flag container — aspect-ratio 3/2, no overflow clip ── */}
              <div
                className="relative flex-shrink-0 w-3/4"
                style={{
                  aspectRatio: '3 / 2',
                  background: '#FFFFFF',
                  borderRadius: '4px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  // overflow NOT set to hidden — was clipping flags like Monaco
                }}
              >
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center animate-pulse" style={{ background: '#e2e8f0' }}>
                    <span className="text-4xl select-none text-slate-400">🏳</span>
                  </div>
                )}
                <img
                  src={currentCountry.flag}
                  alt="Identify this flag"
                  onLoad={() => setLoadedCode(currentCountry.code)}
                  className="w-full h-full object-contain p-1 transition-opacity duration-300"
                  style={{ opacity: imgLoaded ? 1 : 0 }}
                />
              </div>

              {/* Progressive hint */}
              <HintDisplay hintDisplay={state.hintDisplay} hintsUsed={state.hintsUsed} />

              {/* Answer input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isFeedbackVisible}
                placeholder="Country name…"
                className="pill-input"
                style={{
                  maxWidth: '320px',
                  width: '100%',
                  textAlign: 'center',
                  opacity: isFeedbackVisible ? 0.5 : 1,
                }}
              />

              {/* ── FIX 2: Hint row — hearts | hint btn | skip btn ─────────── */}
              <div
                className="flex items-center gap-2"
                style={{ width: '100%', maxWidth: '320px' }}
              >
                <HintHearts totalHintsRemaining={state.totalHintsRemaining} />

                {/* spacer pushes hint right-of-hearts, skip far right */}
                <div className="flex-1" />

                {/* Hint button */}
                <button
                  onClick={onHint}
                  disabled={state.totalHintsRemaining === 0}
                  className="font-fredoka text-sm px-4 py-2 rounded-full border-2 transition-colors duration-150"
                  style={
                    state.totalHintsRemaining > 0
                      ? { borderColor: 'var(--color-gold)', color: 'var(--color-gold)', background: 'transparent', cursor: 'pointer' }
                      : { borderColor: 'rgba(240,192,64,0.25)', color: 'rgba(240,192,64,0.3)', background: 'transparent', cursor: 'not-allowed' }
                  }
                >
                  {state.totalHintsRemaining > 0 ? '💡 Hint' : '✕ No Hints'}
                </button>

                {/* Skip button — coral outlined, never disabled */}
                <button
                  onClick={onSkip}
                  className="font-fredoka text-sm px-4 py-2 rounded-full border-2 transition-colors duration-150"
                  style={{ borderColor: '#E8635A', color: '#E8635A', background: 'transparent', cursor: 'pointer' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#E8635A';
                    (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = '#E8635A';
                  }}
                >
                  ⏭ Skip
                </button>
              </div>
            </div>
          </div>

          {/* ── Below-circle controls ─────────────────────────────── */}
          <div className="mt-6 mx-auto space-y-5" style={{ maxWidth: '520px' }}>
            <AssuranceSlider value={assurance} onChange={setAssurance} />

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={[
                'btn-gold w-full py-4 text-xl uppercase tracking-wide',
                canSubmit ? 'animate-btn-pulse' : '',
              ].join(' ')}
              style={{ opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
            >
              Submit
            </button>

            {/* Feedback — below submit */}
            <div className="min-h-[4.5rem] flex flex-col items-center justify-center">
              {isFeedbackVisible && (
                <>
                  <p
                    className="font-fredoka text-xl text-center"
                    style={{ color: state.lastCorrect ? '#34d399' : '#f87171' }}
                  >
                    {state.lastCorrect
                      ? state.lastResolvedName !== null &&
                        state.lastResolvedName.toLowerCase() !== input.trim().toLowerCase()
                        ? `✓ Correct! (matched: ${state.lastResolvedName})`
                        : '✓ Correct, Good Job!'
                      : `✗ Wrong — it was ${currentCountry.name}`}
                  </p>

                  {state.lastDelta !== null && (
                    <p
                      key={`delta-${state.currentIndex}`}
                      className="font-fredoka text-3xl animate-delta-pop mt-1"
                      style={{ color: state.lastDelta >= 0 ? 'var(--color-gold)' : '#f87171' }}
                    >
                      {state.lastDelta >= 0 ? '+' : ''}{state.lastDelta}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — score sidebar ──────────────────────────── */}
        <div className="md:sticky md:top-6 self-start">
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

            {/* ── FIX 3: Restart button ────────────────────────────── */}
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

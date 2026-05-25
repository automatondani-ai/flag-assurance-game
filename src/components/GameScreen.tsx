import { useState, useEffect, useRef } from 'react';
import type { GameState, Country } from '../types';
import AssuranceSlider from './AssuranceSlider';

interface GameScreenProps {
  state: GameState;
  currentCountry: Country;
  onSubmit: (input: string, assurance: number) => void;
}

export default function GameScreen({ state, currentCountry, onSubmit }: GameScreenProps) {
  const [input, setInput] = useState('');
  const [assurance, setAssurance] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local controls on each new question
  useEffect(() => {
    setInput('');
    setAssurance(0);
    inputRef.current?.focus();
  }, [state.currentIndex]);

  const isFeedbackVisible = state.lastCorrect !== null;
  const canSubmit = input.trim().length > 0 && assurance > 0 && !isFeedbackVisible;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(input, assurance);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  const round = state.currentIndex + 1;
  const progressPct = state.totalQuestions > 0
    ? (state.currentIndex / state.totalQuestions) * 100
    : 0;

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4 py-8">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center gap-4 mb-3">
          <div className="h-px flex-1 bg-gold opacity-20" />
          <span className="font-playfair text-gold text-sm tracking-widest opacity-70 uppercase">
            Flag Assurance
          </span>
          <div className="h-px flex-1 bg-gold opacity-20" />
        </div>

        {/* ── Top progress bar (full width) ───────────────────────────── */}
        <div className="relative h-1.5 bg-navy-input border border-navy-border mb-6 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gold transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
          {/* Completion label — appears at the fill edge when > 5% */}
          {progressPct > 5 && (
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 font-ibm text-[9px] text-gold opacity-60 tabular-nums"
            >
              {Math.round(progressPct)}%
            </span>
          )}
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* ── LEFT PANEL ─────────────────────────────────────────── */}
          <div className="bg-navy-card border border-navy-border p-6 relative">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-gold opacity-40" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-gold opacity-40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-gold opacity-40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-gold opacity-40" />

            {/* Flag image — fixed h-56, object-contain, fade-in on each new country */}
            <div className="border-2 border-navy-border mb-6 bg-navy-input flex items-center justify-center h-56 overflow-hidden">
              <img
                key={currentCountry.code}
                src={currentCountry.flag}
                alt="Identify this flag"
                className="w-full h-full object-contain animate-flag-fade-in"
              />
            </div>

            {/* Feedback area — always in DOM to prevent layout shift */}
            <div
              className={[
                'mb-5 px-4 py-3 border transition-all duration-300 min-h-[3.5rem] flex items-center justify-between',
                isFeedbackVisible
                  ? state.lastCorrect
                    ? 'border-emerald-700 bg-emerald-950 bg-opacity-40 opacity-100'
                    : 'border-red-800 bg-red-950 bg-opacity-40 opacity-100'
                  : 'border-transparent opacity-0',
              ].join(' ')}
            >
              <span
                className={[
                  'font-ibm text-sm tracking-wide',
                  state.lastCorrect ? 'text-emerald-400' : 'text-red-400',
                ].join(' ')}
              >
                {state.lastCorrect
                  ? 'Correct, Good Job.'
                  : `Wrong — it was ${currentCountry.name}`}
              </span>

              {/* Delta — keyed by currentIndex so it remounts (and re-animates) each round */}
              {state.lastDelta !== null && (
                <span
                  key={`delta-${state.currentIndex}`}
                  className={[
                    'font-ibm text-lg font-semibold tabular-nums animate-delta-pop',
                    state.lastDelta >= 0 ? 'text-emerald-400' : 'text-red-400',
                  ].join(' ')}
                >
                  {state.lastDelta >= 0 ? '+' : ''}
                  {state.lastDelta}
                </span>
              )}
            </div>

            {/* Answer input */}
            <label className="block font-ibm text-xs tracking-[0.2em] text-[#6b7a8d] uppercase mb-2">
              Your Answer
            </label>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isFeedbackVisible}
              placeholder="Country name…"
              className="w-full bg-navy-input border border-navy-border text-[#e8e0d0] font-ibm text-sm px-4 py-3 outline-none placeholder-[#2e3a4a] tracking-wide focus:border-gold transition-colors duration-200 mb-6 disabled:opacity-40"
            />

            {/* Assurance slider */}
            <div className="mb-6">
              <AssuranceSlider value={assurance} onChange={setAssurance} />
            </div>

            {/* Submit — pulses when ready */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={[
                'w-full font-ibm text-sm tracking-[0.25em] uppercase py-3 px-6 transition-colors duration-200',
                canSubmit
                  ? 'bg-gold text-navy font-semibold hover:bg-[#e0b862] cursor-pointer animate-btn-pulse'
                  : 'bg-navy-border text-[#3a4557] cursor-not-allowed',
              ].join(' ')}
            >
              Submit
            </button>
          </div>

          {/* ── RIGHT PANEL ────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Player name card */}
            <div className="bg-navy-card border border-navy-border p-5">
              <p className="font-ibm text-[10px] tracking-[0.3em] text-[#4a5568] uppercase mb-1">
                Commander
              </p>
              <p className="font-playfair text-xl text-[#e8e0d0] leading-tight truncate">
                {state.playerName}
              </p>
            </div>

            {/* Score card */}
            <div className="bg-navy-card border border-navy-border p-5 relative overflow-hidden flex-1">
              {/* Decorative watermark */}
              <span className="absolute -right-2 -bottom-4 font-playfair text-[7rem] text-[#D4A853] opacity-[0.04] leading-none select-none pointer-events-none">
                S
              </span>

              <p className="font-ibm text-[10px] tracking-[0.3em] text-[#4a5568] uppercase mb-3">
                Score
              </p>
              <div
                className={[
                  'font-ibm text-5xl font-semibold tabular-nums leading-none mb-1 transition-colors duration-300',
                  state.score >= 0 ? 'text-gold' : 'text-red-400',
                ].join(' ')}
              >
                {state.score >= 0 ? '+' : ''}
                {state.score}
              </div>

              <div className="h-px bg-navy-border my-4" />

              <p className="font-ibm text-[10px] tracking-[0.3em] text-[#4a5568] uppercase mb-1">
                Round
              </p>
              <p className="font-ibm text-2xl text-[#e8e0d0] tabular-nums">
                {round}
                <span className="text-sm text-[#4a5568] ml-1">
                  / {state.totalQuestions}
                </span>
              </p>

              {/* Mini progress pip */}
              <div className="mt-4 h-1 bg-navy-input border border-navy-border">
                <div
                  className="h-full bg-gold transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-ibm text-[9px] text-[#2e3a4a]">0</span>
                <span className="font-ibm text-[9px] text-[#2e3a4a]">
                  {state.totalQuestions}
                </span>
              </div>
            </div>

            {/* Rules card */}
            <div className="bg-navy-card border border-navy-border p-4">
              <p className="font-ibm text-[10px] tracking-[0.25em] text-[#3a4557] uppercase mb-2">
                Rules
              </p>
              <p className="font-ibm text-[11px] text-[#4a5568] leading-relaxed">
                Higher assurance = higher reward or penalty. Score can go negative.
              </p>
            </div>
          </div>
        </div>

        {/* Footer rule */}
        <div className="flex items-center gap-3 mt-6">
          <div className="h-px flex-1 bg-navy-border" />
          <span className="font-ibm text-[#2e3a4a] text-xs tracking-widest">◆</span>
          <div className="h-px flex-1 bg-navy-border" />
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';

interface WelcomeScreenProps {
  onStart: (name: string) => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [name, setName] = useState('');

  const trimmed = name.trim();
  const canStart = trimmed.length > 0;

  function handleSubmit() {
    if (canStart) onStart(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Top rule */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-gold opacity-40" />
          <span className="font-ibm text-gold text-xs tracking-[0.3em] opacity-60">
            EST. MMXXV
          </span>
          <div className="h-px flex-1 bg-gold opacity-40" />
        </div>

        {/* Title */}
        <h1 className="font-playfair text-6xl font-bold text-gold tracking-tight leading-none text-center mb-3">
          FLAG
          <br />
          ASSURANCE
        </h1>

        {/* Subtitle */}
        <p className="font-ibm text-[#9aa3b0] text-sm tracking-[0.15em] text-center mb-10 uppercase">
          Test your flags. Wager your confidence.
        </p>

        {/* Bottom rule */}
        <div className="h-px bg-navy-border mb-10" />

        {/* Card */}
        <div className="bg-navy-card border border-navy-border p-8">
          {/* Corner accents */}
          <div className="absolute top-[7.5rem] left-0 w-3 h-3 border-t-2 border-l-2 border-gold opacity-60" />
          <div className="absolute top-[7.5rem] right-0 w-3 h-3 border-t-2 border-r-2 border-gold opacity-60" />

          <label className="block font-ibm text-xs tracking-[0.2em] text-[#6b7a8d] uppercase mb-2">
            Commander Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your name"
            maxLength={32}
            className="w-full bg-navy-input border border-navy-border text-[#e8e0d0] font-ibm text-sm px-4 py-3 outline-none placeholder-[#2e3a4a] tracking-wide focus:border-gold transition-colors duration-200 mb-6"
          />

          <button
            onClick={handleSubmit}
            disabled={!canStart}
            className={[
              'w-full font-ibm text-sm tracking-[0.25em] uppercase py-3 px-6 transition-all duration-200',
              canStart
                ? 'bg-gold text-navy font-semibold hover:bg-[#e0b862] cursor-pointer'
                : 'bg-navy-border text-[#3a4557] cursor-not-allowed',
            ].join(' ')}
          >
            Begin Mission
          </button>
        </div>

        {/* Bottom rule */}
        <div className="flex items-center gap-3 mt-8">
          <div className="h-px flex-1 bg-navy-border" />
          <span className="font-ibm text-[#2e3a4a] text-xs tracking-widest">◆</span>
          <div className="h-px flex-1 bg-navy-border" />
        </div>
      </div>
    </div>
  );
}

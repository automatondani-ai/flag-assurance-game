import { useState, useEffect, useMemo } from 'react';
import type { Continent } from '../types';
import { COUNTRIES } from '../data/countries';
import LeaderboardTable from './LeaderboardTable';
import { getLeaderboard, type LeaderboardEntry } from '../utils/leaderboard';

interface WelcomeScreenProps {
  onStart: (name: string, continents: Continent[], length: number) => void;
}

const ALL_CONTINENTS: Continent[] = ['Africa', 'Europe', 'Americas', 'Asia', 'Oceania'];
const GAME_LENGTHS = [25, 50, 100, 150, 9999] as const;
const ALL_SENTINEL = 9999;

const REGION_OPTIONS: { id: Continent; label: string }[] = [
  { id: 'Africa',   label: '🌍 Africa'   },
  { id: 'Europe',   label: '🌍 Europe'   },
  { id: 'Americas', label: '🌎 Americas' },
  { id: 'Asia',     label: '🌏 Asia'     },
  { id: 'Oceania',  label: '🌊 Oceania'  },
];

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [name, setName] = useState('');
  const [selectedContinents, setSelectedContinents] = useState<Set<Continent>>(
    new Set(ALL_CONTINENTS),
  );
  const [gameLength, setGameLength] = useState<number>(25);

  const trimmed = name.trim();
  const isWorldSelected = selectedContinents.size === ALL_CONTINENTS.length;

  const pool = useMemo(
    () => COUNTRIES.filter(c => selectedContinents.has(c.continent)),
    [selectedContinents],
  );

  const isAllMode = gameLength === ALL_SENTINEL;
  const effectiveLength = isAllMode ? pool.length : Math.min(gameLength, pool.length);
  const showAllHint = isAllMode;
  const showCapNote = !isAllMode && pool.length > 0 && pool.length < gameLength;
  const canStart = trimmed.length > 0 && pool.length > 0;

  // Load leaderboard reactively so it reflects the latest score when the player
  // returns to this screen after finishing a game.
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  useEffect(() => { setLeaderboard(getLeaderboard()); }, []);

  function toggleContinent(continent: Continent) {
    setSelectedContinents(prev => {
      if (prev.has(continent)) {
        if (prev.size === 1) return prev; // never allow empty selection
        const next = new Set(prev);
        next.delete(continent);
        return next;
      }
      return new Set([...prev, continent]);
    });
  }

  function selectAll() {
    setSelectedContinents(new Set(ALL_CONTINENTS));
  }

  function handleSubmit() {
    if (canStart) onStart(trimmed, Array.from(selectedContinents), effectiveLength);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  // Shared chip class builder
  function chipClass(active: boolean) {
    return [
      'font-ibm text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer select-none',
      active
        ? 'border-gold bg-gold/10 text-gold'
        : 'border-navy-border text-[#4a5568] hover:border-[#3a4a5a] hover:text-[#6b7a8d]',
    ].join(' ');
  }

  return (
    <div className="min-h-screen bg-navy px-4 py-8">
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#D4A853 1px, transparent 1px), linear-gradient(90deg, #D4A853 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-5xl mx-auto">
        {/* Top rule */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-gold opacity-40" />
          <span className="font-ibm text-gold text-xs tracking-[0.3em] opacity-60">
            EST. MMXXV
          </span>
          <div className="h-px flex-1 bg-gold opacity-40" />
        </div>

        {/* ── Two-column layout ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div>
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

            <div className="h-px bg-navy-border mb-8" />

            {/* Card */}
            <div className="bg-navy-card border border-navy-border p-8 space-y-6">

              {/* ── Name input ────────────────────────────────────────────── */}
              <div>
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
                  className="w-full bg-navy-input border border-navy-border text-[#e8e0d0] font-ibm text-sm px-4 py-3 outline-none placeholder-[#2e3a4a] tracking-wide focus:border-gold transition-colors duration-200"
                />
              </div>

              <div className="h-px bg-navy-border" />

              {/* ── Region Selector ───────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-ibm text-xs tracking-[0.2em] text-[#6b7a8d] uppercase">
                    Choose Your Region
                  </label>
                  <span className="font-ibm text-[10px] text-[#4a5568] tabular-nums">
                    {pool.length} flags available
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {REGION_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => toggleContinent(id)}
                      className={chipClass(selectedContinents.has(id))}
                    >
                      {label}
                    </button>
                  ))}
                  <button onClick={selectAll} className={chipClass(isWorldSelected)}>
                    🌐 World
                  </button>
                </div>
              </div>

              <div className="h-px bg-navy-border" />

              {/* ── Game Length ───────────────────────────────────────────── */}
              <div>
                <label className="block font-ibm text-xs tracking-[0.2em] text-[#6b7a8d] uppercase mb-3">
                  Game Length
                </label>

                <div className="grid grid-cols-5 gap-2">
                  {GAME_LENGTHS.map(n => (
                    <button
                      key={n}
                      onClick={() => setGameLength(n)}
                      className={chipClass(gameLength === n)}
                    >
                      <span className="block text-center tabular-nums">
                        {n === ALL_SENTINEL ? 'ALL' : n}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Hint area — always reserves space to prevent layout jump */}
                <div className="mt-2 min-h-[1.25rem]">
                  {showAllHint && (
                    <p className="font-ibm text-[11px] text-[#6b7a8d] leading-snug">
                      {pool.length} flags available for your selection
                    </p>
                  )}
                  {showCapNote && (
                    <p className="font-ibm text-[11px] text-gold opacity-70 leading-snug">
                      Only {pool.length} flags available — game will use all of them
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px bg-navy-border" />

              {/* ── Start button ──────────────────────────────────────────── */}
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
                {canStart && (
                  <span className="ml-2 font-normal opacity-70 tracking-normal normal-case">
                    · {effectiveLength} rounds
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN — sticky leaderboard sidebar ─────────────────── */}
          <div className="md:sticky md:top-6 self-start">
            <div className="bg-navy-card border border-navy-border">
              <div className="px-4 py-3 border-b border-navy-border flex items-center gap-2">
                <span className="font-ibm text-xs tracking-[0.2em] uppercase text-[#6b7a8d]">
                  🏆 Global Top 10
                </span>
              </div>
              <LeaderboardTable entries={leaderboard} />
            </div>
          </div>
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

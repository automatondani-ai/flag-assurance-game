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
  { id: 'Europe',   label: '🇪🇺 Europe'   },
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

  const isAllMode       = gameLength === ALL_SENTINEL;
  const effectiveLength = isAllMode ? pool.length : Math.min(gameLength, pool.length);
  const showAllHint     = isAllMode;
  const showCapNote     = !isAllMode && pool.length > 0 && pool.length < gameLength;
  const canStart        = trimmed.length > 0 && pool.length > 0;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  useEffect(() => { setLeaderboard(getLeaderboard()); }, []);

  function toggleContinent(continent: Continent) {
    setSelectedContinents(prev => {
      if (prev.has(continent)) {
        if (prev.size === 1) return prev;
        const next = new Set(prev);
        next.delete(continent);
        return next;
      }
      return new Set([...prev, continent]);
    });
  }

  function selectAll() { setSelectedContinents(new Set(ALL_CONTINENTS)); }

  function handleSubmit() {
    if (canStart) onStart(trimmed, Array.from(selectedContinents), effectiveLength);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  function chipClass(active: boolean): string {
    return [
      'font-fredoka text-sm px-4 py-1.5 rounded-full border-2 transition-all duration-150 cursor-pointer select-none',
      active
        ? 'border-c-gold bg-c-gold text-c-navy'
        : 'border-c-cream/70 bg-transparent text-c-cream hover:bg-white/10',
    ].join(' ');
  }

  /** Shorthand for positioning decorative emojis absolutely around the circle. */
  const deco = (
    pos: { top?: string; left?: string; right?: string; bottom?: string },
    rot = '0deg',
    size = '2.5rem',
  ) => ({
    position: 'absolute' as const,
    ...pos,
    fontSize: size,
    transform: `rotate(${rot})`,
    opacity: 0.88,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    zIndex: 1,
    lineHeight: 1,
  });

  return (
    <div className="phase-enter min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-green)' }}>
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-10 items-center">

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Title */}
            <div>
              <h1
                className="font-fredoka leading-none"
                style={{ fontSize: '4rem', color: 'var(--color-cream)' }}
              >
                FLAG<br />EXPLORER
              </h1>
              <p className="font-nunito text-lg mt-2" style={{ color: 'rgba(255,248,240,0.72)' }}>
                Test your flags. Wager your confidence.
              </p>
            </div>

            {/* Name input */}
            <div>
              <label
                className="block font-fredoka text-sm uppercase tracking-wide mb-2"
                style={{ color: 'var(--color-cream)' }}
              >
                Explorer Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your explorer name..."
                maxLength={32}
                className="pill-input"
                style={{ fontFamily: "'Fredoka One', cursive", border: '3px solid var(--color-gold)' }}
              />
            </div>

            {/* Region selector */}
            <div>
              <label
                className="block font-fredoka text-sm uppercase tracking-wide mb-2"
                style={{ color: 'var(--color-cream)' }}
              >
                Explore By Region
              </label>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map(({ id, label }) => (
                  <button key={id} onClick={() => toggleContinent(id)} className={chipClass(selectedContinents.has(id))}>
                    {label}
                  </button>
                ))}
                <button onClick={selectAll} className={chipClass(isWorldSelected)}>
                  🌐 World
                </button>
              </div>
            </div>

            {/* Game length */}
            <div>
              <label
                className="block font-fredoka text-sm uppercase tracking-wide mb-2"
                style={{ color: 'var(--color-cream)' }}
              >
                Game Length
              </label>
              <div className="flex flex-wrap gap-2">
                {GAME_LENGTHS.map(n => (
                  <button key={n} onClick={() => setGameLength(n)} className={chipClass(gameLength === n)}>
                    {n === ALL_SENTINEL ? 'ALL' : String(n)}
                  </button>
                ))}
              </div>
              <div className="mt-2 min-h-[1.25rem]">
                {showAllHint && (
                  <p className="font-nunito text-xs" style={{ color: 'rgba(255,248,240,0.5)' }}>
                    {pool.length} flags available for your selection
                  </p>
                )}
                {showCapNote && (
                  <p className="font-nunito text-xs" style={{ color: 'var(--color-gold)' }}>
                    Only {pool.length} flags available — game will use all of them
                  </p>
                )}
              </div>
            </div>

            {/* Begin button */}
            <button
              onClick={handleSubmit}
              disabled={!canStart}
              className="btn-gold w-full py-4 px-10 text-xl uppercase tracking-wide"
            >
              Begin Mission
              {canStart && (
                <span className="ml-2 font-nunito text-base normal-case font-normal opacity-70">
                  · {effectiveLength} rounds
                </span>
              )}
            </button>

            <p className="font-nunito text-xs text-center" style={{ color: 'rgba(255,248,240,0.35)' }}>
              {pool.length} flags in the selected pool
            </p>
          </div>

          {/* ── RIGHT COLUMN — circle stage ─────────────────────────── */}
          <div className="flex justify-center">
            {/* Wrapper for decorative emojis */}
            <div className="relative w-full" style={{ maxWidth: '500px' }}>

              {/* Decorative emojis */}
              <span style={deco({ top: '-22px', left: '-14px' }, '-15deg', '2.5rem')}>🎡</span>
              <span style={deco({ top: '-14px', right: '36px' }, '12deg', '2rem')}>🌟</span>
              <span style={deco({ top: '20%', left: '-22px' }, '-12deg', '2rem')}>🧭</span>
              <span style={deco({ bottom: '16px', right: '-20px' }, '15deg', '2rem')}>🗺️</span>
              <span style={deco({ bottom: '-18px', right: '36px' }, '8deg', '2rem')}>🎯</span>
              <span style={deco({ bottom: '-20px', left: '-12px' }, '-10deg', '2.5rem')}>✈️</span>

              {/* Circle */}
              <div
                className="circle-stage w-full"
                style={{ padding: '2.5rem 2rem', gap: '0.5rem' }}
              >
                <div className="text-[5rem] select-none leading-none mb-1">🌍</div>

                <p className="font-fredoka text-xl mb-1" style={{ color: 'var(--color-navy-text)' }}>
                  GLOBAL TOP 10
                </p>

                {/* Constrain table to centre column of circle so rows stay inside */}
                <div className="w-full" style={{ maxWidth: '380px', maxHeight: '240px', overflowY: 'auto' }}>
                  <LeaderboardTable entries={leaderboard} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

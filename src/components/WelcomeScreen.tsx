import { useState, useEffect, useMemo, useRef } from 'react';
import type { Continent } from '../types';
import { COUNTRIES } from '../data/countries';
import LeaderboardTable from './LeaderboardTable';
import { getLeaderboard, type LeaderboardEntry } from '../utils/leaderboard';

// ── Loading skeleton — 3 pulsing rows ─────────────────────────────────────────
function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 py-2 w-full" style={{ maxWidth: '380px' }}>
      <p className="font-nunito text-sm text-center" style={{ color: 'rgba(27,58,107,0.4)' }}>
        Loading scores...
      </p>
      {[0, 1, 2].map(i => (
        <div key={i} className="h-4 rounded-full animate-pulse" style={{ background: 'rgba(27,58,107,0.12)' }} />
      ))}
    </div>
  );
}

interface WelcomeScreenProps {
  onStart: (name: string, continents: Continent[], length: number) => void;
  /** Name from the previous game — pre-fills the explorer name input. */
  lastPlayerName?: string;
}

const ALL_CONTINENTS: Continent[] = ['Africa', 'Europe', 'Americas', 'Asia', 'Oceania'];
const GAME_LENGTHS = [10, 25, 50, 100, 150, 9999] as const;
const ALL_SENTINEL = 9999;

const REGION_OPTIONS: { id: Continent; label: string }[] = [
  { id: 'Africa',   label: '🌍 Africa'   },
  { id: 'Europe',   label: '🇪🇺 Europe'   },
  { id: 'Americas', label: '🌎 Americas' },
  { id: 'Asia',     label: '🌏 Asia'     },
  { id: 'Oceania',  label: '🌊 Oceania'  },
];

// ── Small checklist item used in the progress summary ──────────────────────────
function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-fredoka text-base leading-none w-4 text-center"
        style={{ color: done ? '#4ADE80' : 'rgba(255,248,240,0.35)' }}
      >
        {done ? '✓' : '○'}
      </span>
      <span
        className="font-nunito text-sm"
        style={{ color: done ? '#4ADE80' : 'rgba(255,248,240,0.55)' }}
      >
        {label}
      </span>
    </div>
  );
}

export default function WelcomeScreen({ onStart, lastPlayerName = '' }: WelcomeScreenProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [name, setName]                         = useState(lastPlayerName);
  // Rule 1: empty on first-ever load; pre-filled when returning from a game
  const [selectedContinents, setSelectedContinents] = useState<Set<Continent>>(new Set<Continent>());
  const [gameLength, setGameLength]             = useState<number>(25);

  // Sync when the parent provides a name after mount (e.g. after resetGame)
  useEffect(() => {
    if (lastPlayerName) setName(lastPlayerName);
  }, [lastPlayerName]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const trimmed        = name.trim();
  const nameComplete   = trimmed.length > 0;
  const regionComplete = selectedContinents.size > 0;
  const isWorldSelected = selectedContinents.size === ALL_CONTINENTS.length;

  const pool = useMemo(
    () => COUNTRIES.filter(c => selectedContinents.has(c.continent)),
    [selectedContinents],
  );

  const isAllMode       = gameLength === ALL_SENTINEL;
  const effectiveLength = isAllMode ? pool.length : Math.min(gameLength, pool.length);
  const showAllHint     = isAllMode && pool.length > 0;
  const showCapNote     = !isAllMode && pool.length > 0 && pool.length < gameLength;
  const allComplete     = nameComplete && regionComplete;
  const canStart        = allComplete;

  // ── Button bounce: fires once when canStart first transitions false → true ──
  const [btnBounce, setBtnBounce] = useState(false);
  const prevCanStart = useRef(false);
  useEffect(() => {
    if (canStart && !prevCanStart.current) {
      setBtnBounce(true);
      const t = setTimeout(() => setBtnBounce(false), 400);
      return () => clearTimeout(t);
    }
    prevCanStart.current = canStart;
  }, [canStart]);

  // ── Global leaderboard ──────────────────────────────────────────────────────
  const [leaderboard, setLeaderboard]               = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  useEffect(() => {
    setLeaderboardLoading(true);
    getLeaderboard()
      .then(setLeaderboard)
      .finally(() => setLeaderboardLoading(false));
  }, []);

  // ── Interaction handlers ────────────────────────────────────────────────────

  /** Rule 2: individual toggle, no minimum-1 guard (can go to empty). */
  function toggleContinent(continent: Continent) {
    setSelectedContinents(prev => {
      const next = new Set(prev);
      if (next.has(continent)) {
        next.delete(continent);
      } else {
        next.add(continent);
      }
      return next;
    });
  }

  /**
   * Rule 3 & 4 & 5: World is a bidirectional toggle.
   * - If all 5 selected → deselect all (back to empty).
   * - Otherwise (0–4 selected) → select all 5.
   */
  function toggleWorld() {
    setSelectedContinents(prev =>
      prev.size === ALL_CONTINENTS.length
        ? new Set<Continent>()          // deselect all
        : new Set(ALL_CONTINENTS),      // select all
    );
  }

  function handleSubmit() {
    if (canStart) onStart(trimmed, Array.from(selectedContinents), effectiveLength);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  /** Dynamic begin-button label based on field completion. */
  function buttonLabel(): string {
    if (allComplete) return 'BEGIN MISSION 🚀';
    if (nameComplete && !regionComplete) return 'Pick a region to continue →';
    if (!nameComplete && regionComplete) return 'Enter your name to continue →';
    return 'Complete the fields above to begin';
  }

  // ── Chip style ─────────────────────────────────────────────────────────────
  function chipClass(active: boolean): string {
    return [
      'font-fredoka text-sm px-4 py-1.5 rounded-full border-2 transition-all duration-150 cursor-pointer select-none',
      active
        ? 'border-c-gold bg-c-gold text-c-navy'
        : 'border-c-cream/70 bg-transparent text-c-cream hover:bg-white/10',
    ].join(' ');
  }

  return (
    /* Screen background — decorative emojis live here */
    <div
      className="phase-enter min-h-screen px-4 py-10 relative overflow-x-hidden"
      style={{ background: 'var(--color-bg-green)' }}
    >
      {/* Decorative emojis — 2 visible on mobile, more on larger screens */}
      <span className="pointer-events-none select-none"
            style={{ position: 'absolute', top: '24px', left: '16px', fontSize: '2.5rem', transform: 'rotate(-15deg)', opacity: 0.20, zIndex: 0 }}>
        🎡
      </span>
      <span className="pointer-events-none select-none"
            style={{ position: 'absolute', top: '32px', right: '20px', fontSize: '2rem', transform: 'rotate(12deg)', opacity: 0.20, zIndex: 0 }}>
        🌟
      </span>
      <span className="hidden sm:block pointer-events-none select-none"
            style={{ position: 'absolute', top: '30%', left: '10px', fontSize: '2rem', transform: 'rotate(-12deg)', opacity: 0.15, zIndex: 0 }}>
        🧭
      </span>
      <span className="hidden sm:block pointer-events-none select-none"
            style={{ position: 'absolute', bottom: '80px', right: '14px', fontSize: '2rem', transform: 'rotate(15deg)', opacity: 0.15, zIndex: 0 }}>
        🗺️
      </span>
      <span className="hidden lg:block pointer-events-none select-none"
            style={{ position: 'absolute', bottom: '50px', right: '40px', fontSize: '2rem', transform: 'rotate(8deg)', opacity: 0.12, zIndex: 0 }}>
        🎯
      </span>
      <span className="hidden lg:block pointer-events-none select-none"
            style={{ position: 'absolute', bottom: '40px', left: '10px', fontSize: '2.5rem', transform: 'rotate(-10deg)', opacity: 0.12, zIndex: 0 }}>
        ✈️
      </span>

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-10 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Title + subtitle */}
            <div>
              <h1 className="font-fredoka leading-none" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: 'var(--color-cream)' }}>
                FLAG<br />EXPLORER
              </h1>
              <p className="font-nunito text-lg mt-2" style={{ color: 'rgba(255,248,240,0.72)' }}>
                Test your flags. Wager your confidence.
              </p>
            </div>

            {/* ── Progress checklist — hidden once all complete ─────── */}
            {!allComplete && (
              <div
                className="rounded-2xl px-4 py-3 space-y-1.5"
                style={{ background: 'rgba(255,255,255,0.09)' }}
              >
                <CheckItem done={nameComplete}   label="Your explorer name" />
                <CheckItem done={regionComplete} label="Region selection"   />
                <CheckItem done={true}           label="Game length"        />
              </div>
            )}

            {/* ── Field 1: Explorer Name ───────────────────────────── */}
            <div>
              <label
                className="block font-nunito text-sm mb-2"
                style={{ color: nameComplete ? '#4ADE80' : '#F59E0B' }}
              >
                {nameComplete ? '① Explorer name ✓' : '① Enter your name'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Your explorer name..."
                  maxLength={32}
                  className="pill-input"
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    border: `3px solid ${nameComplete ? '#4ADE80' : '#F59E0B'}`,
                    paddingRight: nameComplete ? '3rem' : undefined,
                  }}
                />
                {nameComplete && (
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 font-fredoka text-xl select-none pointer-events-none"
                    style={{ color: '#4ADE80' }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </div>

            {/* ── Field 2: Region Selector ─────────────────────────── */}
            <div>
              {/* Label with status dot */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!regionComplete ? 'animate-pulse' : ''}`}
                  style={{ background: regionComplete ? '#4ADE80' : '#F59E0B' }}
                />
                <span className="font-fredoka text-sm uppercase tracking-wide" style={{ color: 'var(--color-cream)' }}>
                  Explore By Region
                </span>
              </div>

              {/* Region chips */}
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map(({ id, label }) => (
                  <button key={id} onClick={() => toggleContinent(id)} className={chipClass(selectedContinents.has(id))}>
                    {label}
                  </button>
                ))}
                <button onClick={toggleWorld} className={chipClass(isWorldSelected)}>
                  🌐 World
                </button>
              </div>

              {/* Validation helper */}
              <div className="mt-2 min-h-[1.25rem]">
                {regionComplete ? (
                  <p className="font-nunito text-sm" style={{ color: '#4ADE80' }}>
                    ② Region selected ✓
                  </p>
                ) : (
                  <p className="font-nunito text-sm italic" style={{ color: '#F59E0B' }}>
                    ② Pick at least one region
                  </p>
                )}
              </div>
            </div>

            {/* ── Field 3: Game Length ─────────────────────────────── */}
            <div>
              {/* Label with green dot (always satisfied) */}
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#4ADE80' }} />
                <span className="font-fredoka text-sm uppercase tracking-wide" style={{ color: 'var(--color-cream)' }}>
                  Game Length
                </span>
              </div>

              {/* Length chips */}
              <div className="flex flex-wrap gap-2">
                {GAME_LENGTHS.map(n => (
                  <button key={n} onClick={() => setGameLength(n)} className={chipClass(gameLength === n)}>
                    {n === ALL_SENTINEL ? 'ALL' : String(n)}
                  </button>
                ))}
              </div>

              {/* Validation + flag count hints */}
              <div className="mt-2 space-y-0.5">
                <p className="font-nunito text-sm" style={{ color: '#4ADE80' }}>
                  ③ Game length set ✓
                </p>
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

            {/* ── Begin button ─────────────────────────────────────── */}
            <button
              onClick={handleSubmit}
              disabled={!canStart}
              className={[
                'w-full py-4 px-10 text-xl tracking-wide font-fredoka rounded-full border-none transition-all duration-200',
                canStart ? 'cursor-pointer' : 'cursor-not-allowed',
                canStart && btnBounce ? 'animate-btn-bounce' : '',
              ].join(' ')}
              style={{
                background: canStart ? 'var(--color-gold)' : 'rgba(148,163,184,0.35)',
                color: canStart ? 'var(--color-navy-text)' : 'rgba(255,255,255,0.4)',
                opacity: canStart ? 1 : 0.7,
              }}
            >
              {buttonLabel()}
              {canStart && (
                <span className="ml-2 font-nunito text-base normal-case font-normal opacity-70">
                  · {effectiveLength} rounds
                </span>
              )}
            </button>

            {/* Flag count — hidden when no regions selected */}
            {pool.length > 0 && (
              <p className="font-nunito text-xs text-center" style={{ color: 'rgba(255,248,240,0.35)' }}>
                {pool.length} flags in the selected pool
              </p>
            )}
          </div>

          {/* ── RIGHT COLUMN — leaderboard card ─────────────────────── */}
          <div>
            {/* card-stage centers itself; overflow:visible so table rows are never clipped */}
            <div
              className="card-stage"
              style={{ alignItems: 'stretch', overflow: 'visible', paddingBottom: '24px' }}
            >
              <div className="text-[5rem] select-none leading-none text-center">🌍</div>
              <p className="font-fredoka text-xl text-center" style={{ color: 'var(--color-navy-text)' }}>
                GLOBAL TOP 10
              </p>
              {leaderboardLoading ? (
                <LeaderboardSkeleton />
              ) : (
                <LeaderboardTable entries={leaderboard} />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

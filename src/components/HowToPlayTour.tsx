import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import { markTourSeen } from '../utils/tour';

/**
 * "How to play" walkthrough, shown over the game screen. GameScreen opens it on the
 * first flag of a player's first game (once per browser) and again from the
 * How to play buttons. While it is open the game clock is paused, and the overlay
 * blocks the game underneath.
 *
 * Each step rings a live control, found by its data-tour attribute, and dims the
 * rest of the page with the ring's box-shadow (same pattern as Chronograph's tour).
 */

const RING_PAD    = 6;   // px between a control and its ring
const GAP         = 16;  // px between the ring and the card
const MARGIN      = 12;  // px the card keeps from the viewport edges
const SITE_BAR_H  = 52;  // the sticky site bar; targets are kept below it

// ── Steps ─────────────────────────────────────────────────────────────────────

type Chip = { text: string; ok: boolean };

interface Step {
  heading: string;
  body:    string;
  /** data-tour value of the control the ring highlights. */
  target:  'answer' | 'confidence' | 'hints' | 'score';
  extra?:  'spelling' | 'wager';
}

const STEPS: Step[] = [
  {
    heading: 'Name the flag',
    body:    'Type the country you think it is. Capitals don’t matter, and a small typo still counts.',
    target:  'answer',
    extra:   'spelling',
  },
  {
    heading: 'Bet your confidence',
    body:    'Before you submit, set how sure you are. Right adds that many points, wrong takes them away. Zero risks nothing.',
    target:  'confidence',
    extra:   'wager',
  },
  {
    heading: 'Stuck? Hint or skip',
    body:    'You get 7 hints for the whole game. Each one shows the next letter of the answer. Skip moves on and scores nothing.',
    target:  'hints',
  },
  {
    heading: 'Watch your score',
    body:    'It changes after every flag and can go below zero, so only bet big when you’re sure.',
    target:  'score',
  },
];

const STEP_COUNT = STEPS.length;

// Spelling examples, checked against both answer checks (gameUtils and the
// leaderboard API). Brazil stands in when the flag on screen is Nigeria or Niger,
// so the tour never gives away the answer.
const SPELLING_CHIPS: Record<'ng' | 'br', Chip[]> = {
  ng: [
    { text: 'Nigeria', ok: true }, { text: 'nigeria', ok: true },
    { text: 'Nigria',  ok: true }, { text: 'Niger',   ok: false },
  ],
  br: [
    { text: 'Brazil', ok: true }, { text: 'brazil',  ok: true },
    { text: 'Brazl',  ok: true }, { text: 'Bolivia', ok: false },
  ],
};

// 'intro' → steps 0..3 → 'done'
type View = 'intro' | 'done' | number;

interface Box { top: number; left: number; width: number; height: number }
interface Layout { view: number; ring: Box; card: { top: number; left: number } }

/** The visible element for a data-tour target (the score exists twice: phone bar and sidebar). */
function findTarget(name: Step['target']): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return all.find(el => el.getClientRects().length > 0) ?? null;
}

function hasSideRoom(r: DOMRect, w: number): 'right' | 'left' | null {
  if (r.right + RING_PAD + GAP + w <= window.innerWidth - MARGIN) return 'right';
  if (r.left - RING_PAD - GAP - w >= MARGIN) return 'left';
  return null;
}

/** Beside the target when there's room, otherwise docked below or above it. */
function placeCard(r: DOMRect, w: number, h: number): { top: number; left: number } {
  const vw = window.innerWidth, vh = window.innerHeight;
  const minTop = SITE_BAR_H + MARGIN;
  const side = hasSideRoom(r, w);
  if (side) {
    const top = Math.max(minTop, Math.min(vh - h - MARGIN, r.top + r.height / 2 - h / 2));
    const left = side === 'right' ? r.right + RING_PAD + GAP : r.left - RING_PAD - GAP - w;
    return { top, left };
  }
  const left = Math.max(MARGIN, (vw - w) / 2);
  const bottomDock = vh - h - MARGIN;
  if (r.bottom + RING_PAD + GAP <= bottomDock) return { top: bottomDock, left };
  if (r.top - RING_PAD - GAP - h >= minTop) return { top: minTop, left };
  return { top: bottomDock, left };
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll so the target is visible and, on narrow screens, sits above the docked card. */
function bringIntoView(el: HTMLElement, w: number, h: number) {
  const behavior: ScrollBehavior = reducedMotion() ? 'auto' : 'smooth';
  const r = el.getBoundingClientRect();
  if (hasSideRoom(r, w)) {
    el.scrollIntoView({ block: 'nearest', behavior });
    return;
  }
  const freeBottom = window.innerHeight - h - MARGIN - GAP - RING_PAD;
  const wantedTop  = Math.max(SITE_BAR_H + MARGIN + RING_PAD, (SITE_BAR_H + freeBottom - r.height) / 2);
  window.scrollBy({ top: r.top - wantedTop, behavior });
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FlagIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 21V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 4.5c4-2 6.5 1.8 10.5 0 1-.4 2.2-.6 3.5-.5v9c-1.3-.1-2.5.1-3.5.5-4 1.8-6.5-2-10.5 0"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.4l2.6 2.6L16 9.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface HowToPlayTourProps {
  /** Called when the tour is finished or skipped. It won't open by itself again. */
  onClose: () => void;
  /** Code of the flag on screen, so the spelling examples never give it away. */
  currentCountryCode: string;
}

export default function HowToPlayTour({ onClose, currentCountryCode }: HowToPlayTourProps) {
  const [view, setView]     = useState<View>('intro');
  const [layout, setLayout] = useState<Layout | null>(null);
  const [wager, setWager]   = useState(60);
  const cardRef = useRef<HTMLDivElement>(null);

  const isStep = typeof view === 'number';
  const step   = isStep ? STEPS[view] : null;

  function close() {
    markTourSeen();
    onClose();
  }

  // Position the ring and card for the current step, and keep them on the control
  // while the page scrolls or resizes.
  useEffect(() => {
    if (typeof view !== 'number') return;
    const { target } = STEPS[view];
    const update = () => {
      const el = findTarget(target);
      const card = cardRef.current;
      if (!el || !card) return;
      const r = el.getBoundingClientRect();
      setLayout({
        view,
        ring: {
          top:    r.top - RING_PAD,
          left:   r.left - RING_PAD,
          width:  r.width + RING_PAD * 2,
          height: r.height + RING_PAD * 2,
        },
        card: placeCard(r, card.offsetWidth, card.offsetHeight),
      });
    };
    // Measure after this render commits (a timer rather than rAF, which a
    // background tab pauses).
    const timer = window.setTimeout(() => {
      const el = findTarget(target);
      const card = cardRef.current;
      if (el && card) bringIntoView(el, card.offsetWidth, card.offsetHeight);
      update();
    }, 0);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [view]);

  // Escape closes the tour (counts as seen).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); markTourSeen(); onClose(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus the main button whenever the screen changes.
  useEffect(() => {
    cardRef.current?.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [view]);

  const placed = isStep && layout !== null && layout.view === view;
  const chips  = SPELLING_CHIPS[currentCountryCode === 'ng' || currentCountryCode === 'ne' ? 'br' : 'ng'];

  let content: ReactNode;
  if (view === 'intro') {
    content = (
      <>
        <span className="flag-tour-icon" aria-hidden="true"><FlagIcon /></span>
        <h2 id="flag-tour-heading" className="flag-tour-heading">How to play</h2>
        <p className="flag-tour-body">A 30-second tour of a round. Your game clock waits until you’re done.</p>
        <div className="flag-tour-actions">
          <button type="button" className="flag-tour-btn-text" onClick={close}>Skip</button>
          <button type="button" className="flag-tour-btn-primary" data-autofocus onClick={() => setView(0)}>
            Show me
          </button>
        </div>
      </>
    );
  } else if (view === 'done') {
    content = (
      <>
        <span className="flag-tour-icon" data-accent="true" aria-hidden="true"><CheckIcon /></span>
        <h2 id="flag-tour-heading" className="flag-tour-heading">You’re ready</h2>
        <p className="flag-tour-body">
          Your best score for each region goes on the Global Top 10. Open this again any time
          with How to play, next to your score.
        </p>
        <div className="flag-tour-actions">
          <button type="button" className="flag-tour-btn-secondary" onClick={() => setView(STEP_COUNT - 1)}>
            Back
          </button>
          <button type="button" className="flag-tour-btn-primary" data-autofocus onClick={close}>
            Start playing
          </button>
        </div>
      </>
    );
  } else if (step) {
    const i = view as number;
    content = (
      <>
        <span className="flag-tour-badge">{i + 1} of {STEP_COUNT}</span>
        <h2 id="flag-tour-heading" className="flag-tour-heading">{step.heading}</h2>
        <p className="flag-tour-body">{step.body}</p>

        {step.extra === 'spelling' && (
          <div className="flag-tour-chips">
            {chips.map(c => (
              <span key={c.text} className="flag-tour-chip" data-ok={c.ok ? 'true' : 'false'}>
                {c.text} {c.ok ? '✓' : '✗'}
              </span>
            ))}
          </div>
        )}

        {step.extra === 'wager' && (
          <div className="flag-tour-demo">
            <label htmlFor="flag-tour-wager" className="flag-tour-demo-label">
              Try it: {wager}% sure
            </label>
            <input
              id="flag-tour-wager"
              type="range"
              min={0}
              max={100}
              step={5}
              value={wager}
              onChange={e => setWager(Number(e.target.value))}
              className="flag-tour-range"
              style={{ '--fill': `${wager}%` } as CSSProperties}
            />
            <div className="flag-tour-demo-result" aria-live="polite">
              <span data-ok="true">Right +{wager}</span>
              <span data-ok="false">Wrong −{wager}</span>
            </div>
          </div>
        )}

        <div className="flag-tour-footer">
          <div className="flag-tour-dots" aria-hidden="true">
            {STEPS.map((_, k) => (
              <span key={k} className="flag-tour-dot" data-active={k === i ? 'true' : 'false'} />
            ))}
          </div>
          <div className="flag-tour-nav">
            <button type="button" className="flag-tour-btn-secondary" onClick={() => setView(i === 0 ? 'intro' : i - 1)}>
              Back
            </button>
            <button
              type="button"
              className="flag-tour-btn-primary"
              data-autofocus
              onClick={() => setView(i === STEP_COUNT - 1 ? 'done' : i + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </>
    );
  }

  // Portalled to <body>: the game screen keeps a transform from its entrance
  // animation, which would make position: fixed relative to the screen, not the
  // viewport, and shift the ring by the site bar's height.
  return createPortal(
    <div
      className="flag-tour"
      data-mode={isStep ? 'step' : 'plain'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-tour-heading"
    >
      {/* Ring around the control; its huge box-shadow dims everything else. It
          stays mounted between steps so it glides to the next control. */}
      {isStep && layout && <div className="flag-tour-ring" aria-hidden="true" style={layout.ring} />}

      <div
        ref={cardRef}
        key={String(view)}
        className="flag-tour-card"
        data-placed={isStep ? (placed ? 'true' : 'false') : undefined}
        style={placed ? { position: 'fixed', top: layout.card.top, left: layout.card.left } : undefined}
      >
        {content}
      </div>
    </div>,
    document.body,
  );
}

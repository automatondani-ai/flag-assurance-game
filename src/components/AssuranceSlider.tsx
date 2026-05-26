import { useRef, useCallback } from 'react';

interface AssuranceSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export default function AssuranceSlider({ value, onChange }: AssuranceSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isTransitioning = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTransition = useCallback(() => {
    isTransitioning.current = true;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      isTransitioning.current = false;
    }, 150);
  }, []);

  const updateValue = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(Math.round(pct * 100));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    isTransitioning.current = false;
    updateValue(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    updateValue(e.clientX);
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    startTransition();
  };

  const knobTransition = isTransitioning.current ? 'transition-all duration-150' : '';

  return (
    <div className="w-full select-none">
      {/* Label + value */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-fredoka text-base uppercase tracking-wide" style={{ color: 'rgba(255,248,240,0.7)' }}>
          Confidence Level
        </span>
        <span
          className="font-fredoka text-2xl tabular-nums transition-colors duration-150"
          style={{ color: value === 0 ? 'rgba(255,248,240,0.25)' : 'var(--color-gold)' }}
        >
          {value}<span className="text-lg ml-0.5">%</span>
        </span>
      </div>

      {/* Track — pointer events handle all mouse + touch interaction */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-4 rounded-full cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.12)', touchAction: 'none' }}
      >
        {/* Gold fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
          style={{ width: `${value}%`, background: 'var(--color-gold)' }}
        />

        {/* Knob — pointer-events: none so track handles all events */}
        <div
          className={[
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'rounded-full pointer-events-none',
            'shadow-lg',
            knobTransition,
          ].join(' ')}
          style={{
            left: `${value}%`,
            width: 'clamp(28px, 5vw, 36px)',
            height: 'clamp(28px, 5vw, 36px)',
            background: 'var(--color-gold)',
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between mt-2">
        {[0, 25, 50, 75, 100].map(tick => (
          <span
            key={tick}
            className="font-nunito text-[10px] tabular-nums transition-colors duration-150"
            style={{ color: value >= tick && tick > 0 ? 'rgba(240,192,64,0.7)' : 'rgba(255,248,240,0.25)' }}
          >
            {tick}
          </span>
        ))}
      </div>

      {/* Zero-confidence hint */}
      {value === 0 && (
        <p className="font-nunito text-xs mt-1 leading-snug" style={{ color: 'rgba(255,248,240,0.35)' }}>
          0 = not confident (no points risked)
        </p>
      )}
    </div>
  );
}

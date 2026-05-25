import { useRef, useEffect, useCallback } from 'react';

interface AssuranceSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export default function AssuranceSlider({ value, onChange }: AssuranceSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isTransitioning = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculateValue = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(pct * 100);
  }, []);

  const startTransition = useCallback(() => {
    isTransitioning.current = true;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      isTransitioning.current = false;
    }, 150);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      onChange(calculateValue(e.clientX));
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      startTransition();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      onChange(calculateValue(e.touches[0].clientX));
    };
    const onTouchEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      startTransition();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [calculateValue, onChange, startTransition]);

  const handleKnobMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    isTransitioning.current = false;
  };

  const handleKnobTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    isTransitioning.current = false;
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (isDragging.current) return;
    onChange(calculateValue(e.clientX));
    startTransition();
  };

  const knobTransition = isTransitioning.current ? 'transition-all duration-150' : '';

  return (
    <div className="w-full select-none">
      {/* Label + value */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-fredoka text-base uppercase tracking-wide" style={{ color: 'rgba(255,248,240,0.7)' }}>
          Assurance
        </span>
        <span
          className="font-fredoka text-2xl tabular-nums transition-colors duration-150"
          style={{ color: value === 0 ? 'rgba(255,248,240,0.25)' : 'var(--color-gold)' }}
        >
          {value}<span className="text-lg ml-0.5">%</span>
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-3 rounded-full cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        {/* Gold fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
          style={{ width: `${value}%`, background: 'var(--color-gold)' }}
        />

        {/* Knob — 28px gold circle with white border */}
        <div
          onMouseDown={handleKnobMouseDown}
          onTouchStart={handleKnobTouchStart}
          className={[
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-7 h-7 rounded-full cursor-grab active:cursor-grabbing',
            'shadow-lg',
            knobTransition,
          ].join(' ')}
          style={{
            left: `${value}%`,
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
          0 = no confidence (no points risked)
        </p>
      )}
    </div>
  );
}

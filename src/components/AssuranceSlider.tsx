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

  // Global mouse/touch move and up handlers attached on drag start
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
    // Ignore if the click originated from a drag release
    if (isDragging.current) return;
    onChange(calculateValue(e.clientX));
    startTransition();
  };

  const knobTransition = isTransitioning.current
    ? 'transition-all duration-150'
    : '';

  return (
    <div className="w-full select-none">
      {/* Label + value */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-ibm text-xs tracking-[0.2em] text-[#6b7a8d] uppercase">
          Assurance
        </span>
        <span
          className={[
            'font-ibm text-xl font-semibold tabular-nums transition-colors duration-150',
            value === 0 ? 'text-[#3a4557]' : 'text-gold',
          ].join(' ')}
        >
          {value}
          <span className="text-sm font-normal ml-0.5">%</span>
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-2 bg-navy-input border border-navy-border cursor-pointer"
      >
        {/* Gold fill */}
        <div
          className="absolute inset-y-0 left-0 bg-gold pointer-events-none"
          style={{ width: `${value}%` }}
        />

        {/* Knob */}
        <div
          onMouseDown={handleKnobMouseDown}
          onTouchStart={handleKnobTouchStart}
          className={[
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-5 h-5 rounded-full bg-gold border-2 border-white shadow-lg',
            'cursor-grab active:cursor-grabbing',
            'hover:shadow-[0_0_0_4px_rgba(212,168,83,0.25)]',
            knobTransition,
          ].join(' ')}
          style={{ left: `${value}%` }}
        />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between mt-2 px-0.5">
        {[0, 25, 50, 75, 100].map(tick => (
          <span
            key={tick}
            className={[
              'font-ibm text-[9px] tabular-nums transition-colors duration-150',
              value >= tick && tick > 0 ? 'text-gold opacity-60' : 'text-[#2e3a4a]',
            ].join(' ')}
          >
            {tick}
          </span>
        ))}
      </div>

      {/* Zero-confidence hint */}
      {value === 0 && (
        <p className="font-ibm text-[10px] text-[#4a5568] mt-1 leading-snug">
          0 = no confidence (no points risked)
        </p>
      )}
    </div>
  );
}

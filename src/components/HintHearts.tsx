import { useState, useEffect, useRef } from 'react';

interface HintHeartsProps {
  /** Global hint budget (0–7). Filled hearts = this value; empty = 7 - this. */
  totalHintsRemaining: number;
}

/** Inline SVG heart path. */
function HeartIcon({ filled, animating }: { filled: boolean; animating: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className={animating ? 'animate-heart-deflate' : ''}
      style={{ display: 'block' }}
    >
      <path
        d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"
        fill={filled ? '#ef4444' : 'none'}
        stroke="#ef4444"
        strokeWidth={filled ? '0' : '1.5'}
      />
    </svg>
  );
}

export default function HintHearts({ totalHintsRemaining }: HintHeartsProps) {
  // Track which heart index is currently animating (the one that just became empty).
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const prevTotalRef = useRef(totalHintsRemaining);

  useEffect(() => {
    const prev = prevTotalRef.current;
    prevTotalRef.current = totalHintsRemaining;

    if (totalHintsRemaining < prev) {
      // The heart at index `totalHintsRemaining` just became empty — animate it.
      setAnimatingIndex(totalHintsRemaining);
      const t = setTimeout(() => setAnimatingIndex(null), 350);
      return () => clearTimeout(t);
    }
  }, [totalHintsRemaining]);

  return (
    <div className="flex flex-col gap-1">
      {/* Label */}
      <span className="font-ibm text-[9px] tracking-[0.2em] text-[#4a5568] uppercase">
        Hints
      </span>

      {/* Seven hearts */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <HeartIcon
            key={i}
            filled={i < totalHintsRemaining}
            animating={animatingIndex === i}
          />
        ))}
      </div>

      {/* Depletion message */}
      {totalHintsRemaining === 0 && (
        <p className="font-ibm text-[10px] text-red-400 leading-snug">
          No hints remaining
        </p>
      )}
    </div>
  );
}

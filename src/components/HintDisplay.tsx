/**
 * HintDisplay — renders the progressive letter-reveal string.
 *
 * Rendering rules (per character):
 *   • Letter (a-z, accented): dark teal, Poppins
 *   • '_': ink/35%, Poppins
 *   • ' ': whitespace (width preserved)
 *   • Other (-, '): muted ink/45%, shown as-is
 *
 * Animation: the newly revealed letter gets a fresh React key on each hint
 * press, causing it to remount and re-run animate-hint-reveal.
 */

interface HintDisplayProps {
  hintDisplay: string;
  hintsUsed: number;
}

const LETTER_RE = /[a-zA-ZÀ-ɏ]/;

export default function HintDisplay({ hintDisplay, hintsUsed }: HintDisplayProps) {
  if (hintsUsed === 0 || !hintDisplay) return null;

  let letterIndex = 0;

  const elements = hintDisplay.split('').map((char, i) => {
    if (LETTER_RE.test(char)) {
      const thisLetterIndex = letterIndex;
      letterIndex++;
      const isNewlyRevealed = thisLetterIndex === hintsUsed - 1;

      return (
        <span
          key={isNewlyRevealed ? `revealed-${hintsUsed}` : `letter-${i}`}
          className={[
            'font-heading',
            isNewlyRevealed ? 'inline-block animate-hint-reveal' : '',
          ].join(' ')}
          style={{ color: 'var(--color-teal-ink)' }}
        >
          {char}
        </span>
      );
    }

    if (char === '_') {
      return (
        <span key={`blank-${i}`} className="font-heading" style={{ color: 'rgba(11,42,74,0.35)' }}>
          _
        </span>
      );
    }

    if (char === ' ') {
      return <span key={`sp-${i}`}>{' '}</span>;
    }

    return (
      <span key={`punct-${i}`} style={{ color: 'rgba(11,42,74,0.45)' }}>
        {char}
      </span>
    );
  });

  return (
    <div className="flex items-center justify-center py-2 min-h-[44px]">
      <span className="font-heading text-2xl tracking-widest select-none">
        {elements}
      </span>
    </div>
  );
}

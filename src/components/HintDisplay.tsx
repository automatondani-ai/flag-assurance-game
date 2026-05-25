/**
 * HintDisplay — renders the progressive letter-reveal string.
 *
 * The hintDisplay string is built by the reducer and looks like:
 *   "N i _ _ _ _ _"       (Nigeria, hintsUsed=2)
 *   "S i e _ _ _   _ _ _ _ _"  (Sierra Leone, hintsUsed=3 — triple-space = original word space)
 *
 * Rendering rules (per character):
 *   • Letter (a-z, accented): gold, font-semibold
 *   • '_': slate-400, font-normal
 *   • ' ': rendered as whitespace (monospace keeps width consistent)
 *   • Other (-, '): muted color, shown as-is
 *
 * Animation: the newly revealed letter (letter-index === hintsUsed - 1) gets a
 * fresh React key on each hint press, causing it to remount and re-run the
 * animate-hint-reveal CSS keyframe.
 */

interface HintDisplayProps {
  hintDisplay: string;
  hintsUsed: number;
}

const LETTER_RE = /[a-zA-ZÀ-ɏ]/;

export default function HintDisplay({ hintDisplay, hintsUsed }: HintDisplayProps) {
  // Nothing to show until at least one hint has been used
  if (hintsUsed === 0 || !hintDisplay) return null;

  let letterIndex = 0;

  const elements = hintDisplay.split('').map((char, i) => {
    if (LETTER_RE.test(char)) {
      // Letter: track its index to decide whether it is the newly revealed one
      const thisLetterIndex = letterIndex;
      letterIndex++;
      const isNewlyRevealed = thisLetterIndex === hintsUsed - 1;

      return (
        <span
          // Fresh key for the newly revealed letter triggers remount → animation replays
          key={isNewlyRevealed ? `revealed-${hintsUsed}` : `letter-${i}`}
          className={[
            'font-semibold text-gold',
            isNewlyRevealed ? 'inline-block animate-hint-reveal' : '',
          ].join(' ')}
        >
          {char}
        </span>
      );
    }

    if (char === '_') {
      return (
        <span key={`blank-${i}`} className="font-normal text-slate-400">
          _
        </span>
      );
    }

    // Space (either a joining space or an original name space) — preserve width
    if (char === ' ') {
      return <span key={`sp-${i}`}>{' '}</span>;
    }

    // Hyphen, apostrophe, or any other punctuation — muted color
    return (
      <span key={`punct-${i}`} className="text-[#6b7a8d]">
        {char}
      </span>
    );
  });

  return (
    <div className="flex items-center justify-center py-3 min-h-[48px]">
      <span className="font-ibm text-2xl tracking-widest select-none">
        {elements}
      </span>
    </div>
  );
}

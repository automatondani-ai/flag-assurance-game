import type { LeaderboardEntry } from '../utils/leaderboard';
import { formatDuration } from '../utils/leaderboard';

interface LeaderboardTableProps {
  /** Sorted entries (best first). */
  entries: LeaderboardEntry[];
  /** 0-based row index to highlight in gold (current player in ResultsScreen). */
  highlightIndex?: number;
  /** When the current player is outside the top 10, render their result below the table. */
  currentEntry?: {
    name: string;
    score: number;
    percentage: number;
    duration: number;
    region: string;
  };
}

/** Exact hex colour for top-3 ranks and the rest. */
function rankColor(i: number): string {
  if (i === 0) return '#D4A853'; // gold
  if (i === 1) return '#9CA3AF'; // silver
  if (i === 2) return '#B45309'; // bronze
  return 'rgba(27,58,107,0.6)';  // navy
}

export default function LeaderboardTable({
  entries,
  highlightIndex,
  currentEntry,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="font-nunito text-sm italic text-center py-6" style={{ color: 'rgba(27,58,107,0.5)' }}>
        No scores yet — be the first!
      </p>
    );
  }

  return (
    <div>
      {/* No overflow wrapper — all rows always visible */}
      <table className="w-full font-nunito border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(27,58,107,0.10)' }}>
            <th className="px-1 py-2 text-left text-xs font-bold tracking-wide uppercase"
                style={{ color: 'rgba(27,58,107,0.4)', width: '20px' }}>#</th>
            <th className="px-1 py-2 text-left text-xs font-bold tracking-wide uppercase"
                style={{ color: 'rgba(27,58,107,0.4)' }}>Name</th>
            <th className="px-1 py-2 text-right text-xs font-bold tracking-wide uppercase"
                style={{ color: 'rgba(27,58,107,0.4)' }}>Score</th>
            <th className="px-1 py-2 text-right text-xs font-bold tracking-wide uppercase"
                style={{ color: 'rgba(27,58,107,0.4)' }}>Acc</th>
            {/* TIME and REGION hidden on mobile, shown on sm+ */}
            <th className="hidden sm:table-cell px-1 py-2 text-right text-xs font-bold tracking-wide uppercase"
                style={{ color: 'rgba(27,58,107,0.4)' }}>Time</th>
            <th className="hidden sm:table-cell px-1 py-2 text-left text-xs font-bold tracking-wide uppercase"
                style={{ color: 'rgba(27,58,107,0.4)' }}>Region</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const isHL = i === highlightIndex;
            const col  = isHL ? '#D4A853' : rankColor(i);
            return (
              <tr
                key={i}
                className="border-b"
                style={{
                  borderColor: 'rgba(27,58,107,0.05)',
                  background: isHL ? 'rgba(212,168,83,0.12)' : 'transparent',
                }}
              >
                {/* Rank — medal colour + bold for top 3 */}
                <td
                  className="px-1 py-1.5 text-xs tabular-nums"
                  style={{
                    color: i < 3 ? rankColor(i) : 'rgba(27,58,107,0.35)',
                    fontWeight: i < 3 ? 700 : undefined,
                  }}
                >
                  {i + 1}
                </td>

                {/* Name — truncated, responsive max-width */}
                <td
                  className="px-1 py-1.5 text-xs font-semibold truncate max-w-[90px] sm:max-w-[120px]"
                  style={{ color: col }}
                >
                  {entry.name}
                </td>

                {/* Score */}
                <td className="px-1 py-1.5 text-xs text-right tabular-nums font-semibold"
                    style={{ color: col }}>
                  {entry.score >= 0 ? '+' : ''}{entry.score}
                </td>

                {/* Accuracy */}
                <td className="px-1 py-1.5 text-xs text-right tabular-nums"
                    style={{ color: isHL ? '#D4A853' : 'rgba(27,58,107,0.45)' }}>
                  {entry.percentage}%
                </td>

                {/* Time — hidden on mobile */}
                <td className="hidden sm:table-cell px-1 py-1.5 text-xs text-right tabular-nums whitespace-nowrap"
                    style={{ color: isHL ? '#D4A853' : 'rgba(27,58,107,0.45)' }}>
                  {formatDuration(entry.duration)}
                </td>

                {/* Region — hidden on mobile */}
                <td className="hidden sm:table-cell px-1 py-1.5 text-xs truncate max-w-[70px]"
                    style={{ color: isHL ? 'rgba(212,168,83,0.8)' : 'rgba(27,58,107,0.35)' }}>
                  {entry.region}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Spacer before circle bottom edge */}
      <div style={{ height: '16px' }} />

      {/* "Your Result" — only when the player is outside the top 10 */}
      {currentEntry && (
        <div className="border-t pt-3 pb-2 px-2" style={{ borderColor: 'rgba(27,58,107,0.10)' }}>
          <p className="font-nunito text-[10px] tracking-wide uppercase text-center mb-2"
             style={{ color: 'rgba(27,58,107,0.40)' }}>
            — Your Result —
          </p>
          <div
            className="rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5"
            style={{ background: 'rgba(27,58,107,0.06)', border: '1px solid rgba(240,192,64,0.4)' }}
          >
            <span className="font-nunito font-semibold text-xs truncate max-w-[100px]"
                  style={{ color: 'var(--color-navy-text)' }}>
              {currentEntry.name}
            </span>
            <span className="font-nunito text-xs tabular-nums"
                  style={{ color: 'rgba(27,58,107,0.6)' }}>
              {currentEntry.score >= 0 ? '+' : ''}{currentEntry.score}
            </span>
            <span className="font-nunito text-xs tabular-nums"
                  style={{ color: 'rgba(27,58,107,0.6)' }}>
              {currentEntry.percentage}%
            </span>
            <span className="font-nunito text-xs tabular-nums whitespace-nowrap"
                  style={{ color: 'rgba(27,58,107,0.6)' }}>
              {formatDuration(currentEntry.duration)}
            </span>
            <span className="font-nunito text-xs truncate max-w-[80px]"
                  style={{ color: 'rgba(27,58,107,0.4)' }}>
              {currentEntry.region}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

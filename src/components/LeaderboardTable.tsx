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

function rankTextColor(i: number): string {
  if (i === 0) return 'text-gold';
  if (i === 1) return 'text-slate-300';
  if (i === 2) return 'text-amber-600';
  return 'text-[#9aa3b0]';
}

export default function LeaderboardTable({
  entries,
  highlightIndex,
  currentEntry,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="font-ibm text-xs text-[#4a5568] italic text-center py-5">
        No scores yet. Be the first!
      </p>
    );
  }

  return (
    <div>
      {/* Scrollable table body; sticky thead needs a positioned parent */}
      <div className="overflow-y-auto max-h-80">
        <table className="w-full font-ibm text-[11px] border-collapse">
          <thead className="sticky top-0 bg-navy-card z-10">
            <tr className="border-b border-navy-border">
              {(['#', 'Name', 'Score', 'Acc', 'Time', 'Region'] as const).map(h => (
                <th
                  key={h}
                  className={[
                    'px-2 py-2 font-normal tracking-[0.08em] uppercase text-[#4a5568]',
                    h === '#' ? 'text-left w-6' :
                    h === 'Name' || h === 'Region' ? 'text-left' :
                    'text-right',
                  ].join(' ')}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const isHL = i === highlightIndex;
              const col = isHL ? 'text-gold' : rankTextColor(i);
              return (
                <tr
                  key={i}
                  className={[
                    'border-b border-navy-border/30 transition-colors duration-100',
                    isHL ? 'bg-gold/10' : 'hover:bg-navy-input',
                  ].join(' ')}
                >
                  {/* Rank — always medal-colored for top 3, regardless of highlight */}
                  <td className={`px-2 py-1.5 tabular-nums ${i < 3 ? rankTextColor(i) : 'text-[#4a5568]'}`}>
                    {i + 1}
                  </td>
                  <td className={`px-2 py-1.5 font-semibold max-w-[90px] truncate ${col}`}>
                    {entry.name}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${col}`}>
                    {entry.score >= 0 ? '+' : ''}{entry.score}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${isHL ? 'text-gold' : 'text-[#9aa3b0]'}`}>
                    {entry.percentage}%
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${isHL ? 'text-gold' : 'text-[#9aa3b0]'}`}>
                    {formatDuration(entry.duration)}
                  </td>
                  <td className={`px-2 py-1.5 max-w-[70px] truncate ${isHL ? 'text-gold/70' : 'text-[#6b7a8d]'}`}>
                    {entry.region}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* "Your Result" — only when the player is not in the top 10 */}
      {currentEntry && (
        <div className="border-t border-navy-border pt-3 pb-2 px-2">
          <p className="font-ibm text-[9px] tracking-[0.2em] uppercase text-[#4a5568] mb-2 text-center">
            — Your Result —
          </p>
          <div className="bg-navy-input border border-gold/20 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-ibm text-[11px]">
            <span className="font-semibold text-[#e8e0d0] max-w-[100px] truncate">
              {currentEntry.name}
            </span>
            <span className="tabular-nums text-[#9aa3b0]">
              {currentEntry.score >= 0 ? '+' : ''}{currentEntry.score}
            </span>
            <span className="tabular-nums text-[#9aa3b0]">{currentEntry.percentage}%</span>
            <span className="tabular-nums text-[#9aa3b0] whitespace-nowrap">
              {formatDuration(currentEntry.duration)}
            </span>
            <span className="text-[#6b7a8d] truncate">{currentEntry.region}</span>
          </div>
        </div>
      )}
    </div>
  );
}

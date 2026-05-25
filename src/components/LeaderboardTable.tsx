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

/** Medal colour for top-3 ranks on a cream/light background. */
function rankTextColor(i: number): string {
  if (i === 0) return 'text-amber-500';   // gold
  if (i === 1) return 'text-slate-400';   // silver
  if (i === 2) return 'text-amber-700';   // bronze
  return 'text-c-navy/50';
}

export default function LeaderboardTable({
  entries,
  highlightIndex,
  currentEntry,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="font-nunito text-sm text-c-navy/50 italic text-center py-6">
        No scores yet — be the first!
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-y-auto max-h-72">
        <table className="w-full font-nunito text-[12px] border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: 'var(--color-cream)' }}>
            <tr className="border-b border-c-navy/10">
              {(['#', 'Name', 'Score', 'Acc', 'Time', 'Region'] as const).map(h => (
                <th
                  key={h}
                  className={[
                    'px-2 py-2 font-nunito font-700 tracking-wide uppercase text-c-navy/40',
                    h === '#'                    ? 'text-left w-6' :
                    h === 'Name' || h === 'Region' ? 'text-left'    :
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
              const col  = isHL ? 'text-amber-500' : rankTextColor(i);
              return (
                <tr
                  key={i}
                  className={[
                    'border-b border-c-navy/5 transition-colors duration-100',
                    isHL ? 'bg-c-gold/20' : 'hover:bg-c-navy/5',
                  ].join(' ')}
                >
                  {/* Rank — medal colour for top 3 regardless of highlight */}
                  <td className={`px-2 py-1.5 tabular-nums font-nunito font-semibold ${i < 3 ? rankTextColor(i) : 'text-c-navy/35'}`}>
                    {i + 1}
                  </td>
                  <td className={`px-2 py-1.5 font-nunito font-semibold max-w-[90px] truncate ${col}`}>
                    {entry.name}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-nunito font-semibold ${col}`}>
                    {entry.score >= 0 ? '+' : ''}{entry.score}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-nunito ${isHL ? 'text-amber-500' : 'text-c-navy/45'}`}>
                    {entry.percentage}%
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap font-nunito ${isHL ? 'text-amber-500' : 'text-c-navy/45'}`}>
                    {formatDuration(entry.duration)}
                  </td>
                  <td className={`px-2 py-1.5 max-w-[70px] truncate font-nunito ${isHL ? 'text-amber-500/80' : 'text-c-navy/35'}`}>
                    {entry.region}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* "Your Result" — only when the player is outside the top 10 */}
      {currentEntry && (
        <div className="border-t border-c-navy/10 pt-3 pb-2 px-2">
          <p className="font-nunito text-[10px] tracking-wide uppercase text-c-navy/40 mb-2 text-center">
            — Your Result —
          </p>
          <div
            className="rounded-xl px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5"
            style={{ background: 'rgba(27,58,107,0.06)', border: '1px solid rgba(240,192,64,0.4)' }}
          >
            <span className="font-nunito font-semibold text-[12px] text-c-navy max-w-[100px] truncate">
              {currentEntry.name}
            </span>
            <span className="font-nunito text-[12px] tabular-nums text-c-navy/60">
              {currentEntry.score >= 0 ? '+' : ''}{currentEntry.score}
            </span>
            <span className="font-nunito text-[12px] tabular-nums text-c-navy/60">{currentEntry.percentage}%</span>
            <span className="font-nunito text-[12px] tabular-nums text-c-navy/60 whitespace-nowrap">
              {formatDuration(currentEntry.duration)}
            </span>
            <span className="font-nunito text-[12px] text-c-navy/40 truncate">{currentEntry.region}</span>
          </div>
        </div>
      )}
    </div>
  );
}

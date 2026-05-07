import type { TierStats, TierNum } from '@/lib/types';
import { formatNumber } from '@/lib/snapshot';

interface Props {
  byTier: Record<TierNum, TierStats>;
}

const TIER_DESCRIPTIONS: Record<TierNum, { label: string; sub: string }> = {
  1: { label: 'Tier 1', sub: 'Live EOY call required' },
  2: { label: 'Tier 2', sub: 'Live EOY call expected' },
  3: { label: 'Tier 3', sub: 'Async outreach only' },
};

export function TierBreakdownTable({ byTier }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Tier</th>
            <th className="px-4 py-3 text-right font-semibold">Total</th>
            <th className="px-4 py-3 text-right font-semibold">Completed</th>
            <th className="px-4 py-3 text-right font-semibold">Booked</th>
            <th className="px-4 py-3 text-right font-semibold">Remaining</th>
            <th className="px-4 py-3 text-right font-semibold">Overdue</th>
            <th className="px-4 py-3 text-left font-semibold">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {([1, 2, 3] as TierNum[]).map((n) => {
            const t = byTier[n];
            const meta = TIER_DESCRIPTIONS[n];
            const isAsync = n === 3;
            const pct = t.total > 0 ? ((t.completed + t.booked) / t.total) * 100 : 0;
            return (
              <tr key={n} className="text-zinc-900">
                <td className="px-4 py-3">
                  <div className="font-semibold">{meta.label}</div>
                  <div className="text-xs text-zinc-500">{meta.sub}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(t.total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                  {isAsync ? '—' : formatNumber(t.completed)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                  {isAsync ? '—' : formatNumber(t.booked)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(t.remaining)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600">
                  {isAsync ? '—' : formatNumber(t.overdue)}
                </td>
                <td className="px-4 py-3">
                  {isAsync ? (
                    <span className="text-xs text-zinc-400">async only</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 rounded-full bg-zinc-200">
                        <div
                          className="h-2 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-zinc-600">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

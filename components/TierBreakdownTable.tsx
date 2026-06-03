import type { TierStats, TierNum } from '@/lib/types';
import { formatNumber } from '@/lib/snapshot';

interface Props {
  byTier: Record<TierNum, TierStats>;
}

const TIER_DESCRIPTIONS: Record<TierNum, { label: string; sub: string }> = {
  1: { label: 'Tier 1', sub: 'Live EOY call required' },
  2: { label: 'Tier 2', sub: 'Live EOY call expected' },
  3: { label: 'Tier 3', sub: 'Async by default' },
};

export function TierBreakdownTable({ byTier }: Props) {
  // A plain cohort funnel, reported by each district's actual state:
  // Completed + Booked + Remaining = Total, summed across all tiers. Tier 3
  // shows its real Booked too — owners flip some Tier-3 districts to live
  // calls, and those bookings should report under Booked, not be hidden.
  // The live-vs-async split is reported separately (by meeting type) via the
  // async progress bar and "Total async" tile.
  // Overdue is intentionally not shown — it overlaps Remaining (a subset, not
  // a separate bucket), so it read as a confusing addable column. The data
  // still tracks it for the gap-to-goal at-risk nudge.
  const totals = {
    total: byTier[1].total + byTier[2].total + byTier[3].total,
    completed: byTier[1].completed + byTier[2].completed + byTier[3].completed,
    booked: byTier[1].booked + byTier[2].booked + byTier[3].booked,
    remaining: byTier[1].remaining + byTier[2].remaining + byTier[3].remaining,
  };
  const totalPct =
    totals.total > 0 ? ((totals.completed + totals.booked) / totals.total) * 100 : 0;

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
            <th className="px-4 py-3 text-left font-semibold">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {([1, 2, 3] as TierNum[]).map((n) => {
            const t = byTier[n];
            const meta = TIER_DESCRIPTIONS[n];
            const pct = t.total > 0 ? ((t.completed + t.booked) / t.total) * 100 : 0;
            return (
              <tr key={n} className="text-zinc-900">
                <td className="px-4 py-3">
                  <div className="font-semibold">{meta.label}</div>
                  <div className="text-xs text-zinc-500">{meta.sub}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(t.total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                  {formatNumber(t.completed)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                  {formatNumber(t.booked)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(t.remaining)}
                </td>
                <td className="px-4 py-3">
                  <ProgressBar pct={pct} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold text-zinc-900">
          <tr>
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatNumber(totals.total)}</td>
            <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
              {formatNumber(totals.completed)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
              {formatNumber(totals.booked)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{formatNumber(totals.remaining)}</td>
            <td className="px-4 py-3">
              <ProgressBar pct={totalPct} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-32 rounded-full bg-zinc-200">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-zinc-600">{pct.toFixed(0)}%</span>
    </div>
  );
}

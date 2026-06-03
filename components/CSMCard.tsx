import Link from 'next/link';
import type { CSMConfig, CSMSnapshot } from '@/lib/types';
import { formatNumber, funnelTotals } from '@/lib/snapshot';

interface Props {
  csm: CSMConfig;
  snapshot: CSMSnapshot;
}

export function CSMCard({ csm, snapshot }: Props) {
  const { stats, gapToGoal: gap, districts } = snapshot;
  const total = districts.length;
  // Done + Booked + Remaining = total. "Booked" = on the calendar, not yet
  // held (so it doesn't overlap Done the way the cumulative stats.booked does).
  const funnel = funnelTotals(stats.byTier);
  return (
    <Link
      href={`/${csm.slug}`}
      className="group flex flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-700">
          {csm.firstName}
        </h3>
        <span className="text-xs text-zinc-500 group-hover:text-zinc-700">View →</span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{formatNumber(total)} districts in portfolio</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Stat label="Done" value={funnel.completed} tone="good" />
        <Stat label="Booked" value={funnel.booked} tone="good" />
        <Stat label="Remaining" value={funnel.remaining} />
      </dl>

      {gap.unbooked > 0 ? (
        <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          <span className="font-semibold">Book {formatNumber(gap.weeklyTarget)} per week</span>{' '}
          to clear backlog
          {gap.thisWeekUrgent > gap.weeklyTarget && (
            <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
              behind
            </span>
          )}
        </p>
      ) : (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          ✓ All booked
        </p>
      )}

      {stats.upsellCandidates > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          💡 {formatNumber(stats.upsellCandidates)} upsell{' '}
          {stats.upsellCandidates === 1 ? 'candidate' : 'candidates'}
        </p>
      )}
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger' | 'good';
}) {
  const valueClass =
    tone === 'danger'
      ? 'text-red-600'
      : tone === 'good'
        ? 'text-emerald-600'
        : 'text-zinc-900';
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className={`text-xl font-semibold tabular-nums ${valueClass}`}>
        {formatNumber(value)}
      </dd>
    </div>
  );
}

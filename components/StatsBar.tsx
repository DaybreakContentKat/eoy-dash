import type { PortfolioStats } from '@/lib/types';
import { formatNumber } from '@/lib/snapshot';

interface Props {
  stats: PortfolioStats;
}

export function StatsBar({ stats }: Props) {
  const items: Array<{ label: string; value: number; tone?: 'danger' | 'warning' | 'good' }> = [
    { label: 'T1+T2 districts', value: stats.totalT1T2 },
    { label: 'Completed', value: stats.completed, tone: 'good' },
    { label: 'Booked', value: stats.booked, tone: 'good' },
    { label: 'Outreach sent', value: stats.outreachSent },
    { label: 'Overdue', value: stats.overdue, tone: 'danger' },
    { label: 'Upsell candidates', value: stats.upsellCandidates, tone: 'warning' },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {it.label}
          </dt>
          <dd className={toneClass(it.tone)}>{formatNumber(it.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function toneClass(tone?: 'danger' | 'warning' | 'good'): string {
  const base = 'mt-1 text-2xl font-semibold tabular-nums';
  if (tone === 'danger') return `${base} text-red-600`;
  if (tone === 'warning') return `${base} text-amber-600`;
  if (tone === 'good') return `${base} text-emerald-600`;
  return `${base} text-zinc-900`;
}

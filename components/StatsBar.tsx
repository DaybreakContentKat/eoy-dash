import type { PortfolioStats } from '@/lib/types';
import { UPSELL_REPORT_URL } from '@/lib/config';
import { formatNumber } from '@/lib/snapshot';

interface Props {
  stats: PortfolioStats;
}

type Tone = 'danger' | 'warning' | 'good';

interface Item {
  label: string;
  value: number;
  tone?: Tone;
  href?: string;
}

export function StatsBar({ stats }: Props) {
  const items: Item[] = [
    { label: 'Total districts', value: stats.totalDistricts },
    { label: 'T1+T2', value: stats.totalT1T2 },
    { label: 'Total async', value: stats.asyncTotal },
    { label: 'Completed', value: stats.completed, tone: 'good' },
    { label: 'Booked', value: stats.booked, tone: 'good' },
    { label: 'Outreach sent', value: stats.outreachSent },
    {
      label: 'Upsell candidates',
      value: stats.upsellCandidates,
      tone: 'warning',
      href: UPSELL_REPORT_URL,
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((it) => (
          <Tile key={it.label} item={it} />
        ))}
      </dl>
      <AsyncProgress completed={stats.asyncCompleted} total={stats.asyncTotal} />
    </div>
  );
}

function AsyncProgress({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return null;
  const pct = (completed / total) * 100;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Async check-ins completed
        </span>
        <span className="text-xs tabular-nums text-zinc-600">
          {formatNumber(completed)} / {formatNumber(total)} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-zinc-200">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(100, pct).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}

function Tile({ item }: { item: Item }) {
  const tileClass =
    'rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm';
  const linkClass =
    `${tileClass} group block transition hover:border-zinc-300 hover:shadow-md`;

  const inner = (
    <>
      <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {item.label}
        {item.href && (
          <span className="text-zinc-400 group-hover:text-zinc-600">↗</span>
        )}
      </dt>
      <dd className={toneClass(item.tone)}>{formatNumber(item.value)}</dd>
    </>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        title="Open upsell candidate report"
      >
        {inner}
      </a>
    );
  }
  return <div className={tileClass}>{inner}</div>;
}

function toneClass(tone?: Tone): string {
  const base = 'mt-1 text-2xl font-semibold tabular-nums';
  if (tone === 'danger') return `${base} text-red-600`;
  if (tone === 'warning') return `${base} text-amber-600`;
  if (tone === 'good') return `${base} text-emerald-600`;
  return `${base} text-zinc-900`;
}

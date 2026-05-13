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
    { label: 'T1+T2 districts', value: stats.totalT1T2 },
    { label: 'Completed', value: stats.completed, tone: 'good' },
    { label: 'Booked', value: stats.booked, tone: 'good' },
    { label: 'Outreach sent', value: stats.outreachSent },
    { label: 'Overdue', value: stats.overdue, tone: 'danger' },
    {
      label: 'Upsell candidates',
      value: stats.upsellCandidates,
      tone: 'warning',
      href: UPSELL_REPORT_URL,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <Tile key={it.label} item={it} />
      ))}
    </dl>
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

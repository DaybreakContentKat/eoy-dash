import type { District } from '@/lib/types';

interface Props {
  orphans: District[];
}

export function OrphanSection({ orphans }: Props) {
  if (orphans.length === 0) return null;
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-amber-900">
          ⚠ {orphans.length} district{orphans.length === 1 ? '' : 's'} not on a CSM page
        </h2>
        <span className="text-xs text-amber-800">
          Excluded from portfolios — reason below
        </span>
      </header>
      <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {orphans.map((d) => (
          <li
            key={d.name}
            className="rounded border border-amber-200/60 bg-white/60 px-3 py-2 text-zinc-800"
          >
            <div className="font-medium">{d.shortName || d.name}</div>
            {d.orphanReason && (
              <div className={`text-xs font-medium ${reasonClass(d.orphanReason)}`}>
                {d.orphanReason}
              </div>
            )}
            {d.lastDayOfSchool && (
              <div className="text-xs text-zinc-500">
                LDoS {formatShortDate(d.lastDayOfSchool)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function reasonClass(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('churn')) return 'text-red-700';
  if (r.includes('onsite')) return 'text-blue-700';
  if (r.includes('unsure') || r.includes('missing')) return 'text-amber-700';
  return 'text-zinc-600';
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

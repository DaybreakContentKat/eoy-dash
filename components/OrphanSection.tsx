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
          ⚠ {orphans.length} district{orphans.length === 1 ? '' : 's'} need an Account Owner
        </h2>
        <span className="text-xs text-amber-800">
          Not assigned to any CSM page
        </span>
      </header>
      <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {orphans.map((d) => (
          <li
            key={d.name}
            className="rounded border border-amber-200/60 bg-white/60 px-3 py-2 text-zinc-800"
          >
            <div className="font-medium">{d.shortName || d.name}</div>
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

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

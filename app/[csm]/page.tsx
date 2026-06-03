import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BTS_TRACKER_URL, CSM_CONFIG, CSM_SLUGS } from '@/lib/config';
import { formatNumber, formatRefreshedAt, loadSnapshot } from '@/lib/snapshot';
import { BatchActionBar } from '@/components/BatchActionBar';
import { DistrictCard } from '@/components/DistrictCard';
import { GapToGoalBanner } from '@/components/GapToGoalBanner';
import { StaleWarning } from '@/components/StaleWarning';
import type { CardStatus, CSMConfig, District } from '@/lib/types';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return CSM_SLUGS.map((csm) => ({ csm }));
}

interface PageProps {
  params: Promise<{ csm: string }>;
}

export default async function CSMPage({ params }: PageProps) {
  const { csm: slug } = await params;
  const config = CSM_CONFIG[slug];
  if (!config) notFound();

  const snapshot = await loadSnapshot();
  const csmSnap = snapshot.csms[slug];
  if (!csmSnap) notFound();

  const sections = bucketDistricts(csmSnap.districts);

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-700"
            >
              ← Daybreak Health · BTS 2026
            </Link>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
              {config.fullName}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {formatNumber(csmSnap.districts.length)} districts in portfolio
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            Last refreshed {formatRefreshedAt(snapshot.refreshedAt)}
          </p>
        </header>

        {snapshot.stale && <StaleWarning />}

        <a
          href={BTS_TRACKER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 hover:bg-blue-100"
        >
          <span>
            📊 <span className="font-semibold">Log your actions in the BTS tracker</span> after sending emails or completing meetings — keeps the dashboard and source data in sync.
          </span>
          <span className="shrink-0 text-xs font-semibold underline">Open tracker →</span>
        </a>

        <QuickStats stats={csmSnap.stats} />

        <GapToGoalBanner gap={csmSnap.gapToGoal} scope="this week" />

        <BatchActionBar csm={config} districts={csmSnap.districts} />

        <Section
          title="Overdue — book now"
          icon="🔴"
          districts={sections.overdue}
          emptyHint="Nothing overdue. Nice."
          sortBy="bookingTarget"
          csm={config}
        />
        <Section
          title="Schedule soon"
          icon="📆"
          districts={sections['schedule-soon']}
          emptyHint="No outstanding bookings to schedule."
          sortBy="bookingTarget"
          csm={config}
        />
        <Section
          title="Booked — prep needed"
          icon="✅"
          districts={sections.booked}
          emptyHint="No booked meetings yet."
          sortBy="meetingDate"
          csm={config}
        />
        <Section
          title="Async only"
          icon="📋"
          districts={sections['async']}
          emptyHint="No async-only districts."
          sortBy="name"
          collapsedByDefault
          csm={config}
        />
        <Section
          title="Completed"
          icon="✓"
          districts={sections.completed}
          emptyHint="None completed yet."
          sortBy="name"
          collapsedByDefault
          csm={config}
        />
      </div>
    </main>
  );
}

function QuickStats({
  stats,
}: {
  stats: {
    totalT1T2: number;
    asyncTotal: number;
    completed: number;
    booked: number;
    upsellCandidates: number;
  };
}) {
  const items: Array<{ label: string; value: number; tone?: 'danger' | 'warning' | 'good' }> = [
    { label: 'T1+T2', value: stats.totalT1T2 },
    { label: 'Total async', value: stats.asyncTotal },
    { label: 'Completed', value: stats.completed, tone: 'good' },
    { label: 'Booked', value: stats.booked, tone: 'good' },
    { label: 'Upsell', value: stats.upsellCandidates, tone: 'warning' },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {it.label}
          </dt>
          <dd
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              it.tone === 'danger'
                ? 'text-red-600'
                : it.tone === 'warning'
                  ? 'text-amber-600'
                  : it.tone === 'good'
                    ? 'text-emerald-600'
                    : 'text-zinc-900'
            }`}
          >
            {formatNumber(it.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface SectionProps {
  title: string;
  icon: string;
  districts: District[];
  emptyHint: string;
  sortBy: 'bookingTarget' | 'meetingDate' | 'name';
  collapsedByDefault?: boolean;
  csm: CSMConfig;
}

function Section({ title, icon, districts, emptyHint, sortBy, collapsedByDefault, csm }: SectionProps) {
  const sorted = [...districts].sort(sortFor(sortBy));
  const open = !collapsedByDefault && districts.length > 0;
  return (
    <details open={open} className="group">
      <summary className="mb-3 flex cursor-pointer items-center justify-between rounded-md py-1 hover:bg-zinc-100">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
          <span>{icon}</span>
          <span>{title}</span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-bold text-zinc-700 group-open:bg-zinc-200">
            {districts.length}
          </span>
        </h2>
        <span className="text-xs text-zinc-400 group-open:rotate-90 transition">▶</span>
      </summary>
      {sorted.length === 0 ? (
        <p className="rounded-md bg-white px-4 py-6 text-center text-sm text-zinc-400">
          {emptyHint}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((d) => (
            <DistrictCard key={d.name} district={d} csm={csm} />
          ))}
        </div>
      )}
    </details>
  );
}

function bucketDistricts(districts: District[]): Record<CardStatus, District[]> {
  const out: Record<CardStatus, District[]> = {
    overdue: [],
    'schedule-soon': [],
    booked: [],
    async: [],
    completed: [],
  };
  for (const d of districts) {
    const bucket = out[d.status] ?? out['schedule-soon'];
    bucket.push(d);
  }
  return out;
}

function sortFor(by: 'bookingTarget' | 'meetingDate' | 'name'): (a: District, b: District) => number {
  if (by === 'name') return (a, b) => a.name.localeCompare(b.name);
  return (a, b) => {
    const av = (by === 'bookingTarget' ? a.bookingTarget : a.meetingDate) ?? '￿';
    const bv = (by === 'bookingTarget' ? b.bookingTarget : b.meetingDate) ?? '￿';
    return av.localeCompare(bv);
  };
}

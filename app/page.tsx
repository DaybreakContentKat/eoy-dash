import { CSM_CONFIG, CSM_SLUGS } from '@/lib/config';
import { formatRefreshedAt, loadSnapshot } from '@/lib/snapshot';
import { CSMCard } from '@/components/CSMCard';
import { GapToGoalBanner } from '@/components/GapToGoalBanner';
import { OrphanSection } from '@/components/OrphanSection';
import { StaleWarning } from '@/components/StaleWarning';
import { StatsBar } from '@/components/StatsBar';
import { TierBreakdownTable } from '@/components/TierBreakdownTable';

export default async function Home() {
  const snapshot = await loadSnapshot();
  const { portfolio, csms, orphans, refreshedAt, stale } = snapshot;

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Daybreak Health · BTS 2026
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
              EOY Dashboard
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Last refreshed {formatRefreshedAt(refreshedAt)}
          </p>
        </header>

        {stale && <StaleWarning />}

        <section>
          <h2 className="sr-only">Portfolio stats</h2>
          <StatsBar stats={portfolio.stats} />
        </section>

        <section>
          <GapToGoalBanner gap={portfolio.gapToGoal} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Tier breakdown
          </h2>
          <TierBreakdownTable byTier={portfolio.stats.byTier} />
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              CSM portfolios
            </h2>
            <p className="text-xs text-zinc-600">
              👇 Click your name to prep this week's actions.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CSM_SLUGS.map((slug) => {
              const csm = CSM_CONFIG[slug];
              const csmSnap = csms[slug];
              if (!csmSnap) return null;
              return <CSMCard key={slug} csm={csm} snapshot={csmSnap} />;
            })}
          </div>
        </section>

        <OrphanSection orphans={orphans} />

        <footer className="border-t border-zinc-200 pt-4 text-xs text-zinc-400">
          Data refreshes daily · {portfolio.stats.totalT1T2 + orphans.length} districts tracked
        </footer>
      </div>
    </main>
  );
}

import type { PortfolioStats, Snapshot, TierNum } from './types';

// Snapshot is served straight from the repo via GitHub's raw CDN so the
// dashboard reflects daily refreshes without needing a Netlify rebuild.
// GitHub raw caches each URL for 5 minutes, so we bucket a cache-buster by
// minute: same URL within a minute (CDN can cache) but a fresh URL every
// minute so post-refresh changes show up within ~60s.
const SNAPSHOT_URL_BASE =
  'https://raw.githubusercontent.com/DaybreakContentKat/eoy-dash/main/public/data/snapshot.json';

export async function loadSnapshot(): Promise<Snapshot> {
  const bucket = Math.floor(Date.now() / 60_000);
  const res = await fetch(`${SNAPSHOT_URL_BASE}?t=${bucket}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load snapshot: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Snapshot;
}

export function formatRefreshedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' ET';
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// The reconciling funnel for a set of districts: every district is in exactly
// one of these states, so completed + booked + remaining = total. "booked"
// here means on the calendar but NOT yet held — distinct from the raw
// `stats.booked` (cumulative, which also counts completed meetings and so
// can't be added to `completed` without double-counting). Use this everywhere
// a "Booked" count sits next to "Completed"/"Done" so the numbers add up.
export function funnelTotals(byTier: PortfolioStats['byTier']): {
  completed: number;
  booked: number;
  remaining: number;
} {
  const tiers: TierNum[] = [1, 2, 3];
  return {
    completed: tiers.reduce((n, t) => n + byTier[t].completed, 0),
    booked: tiers.reduce((n, t) => n + byTier[t].booked, 0),
    remaining: tiers.reduce((n, t) => n + byTier[t].remaining, 0),
  };
}

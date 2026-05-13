import type { Snapshot } from './types';

// Snapshot is served straight from the repo via GitHub's raw CDN so the
// dashboard reflects daily refreshes without needing a Netlify rebuild.
const SNAPSHOT_URL =
  'https://raw.githubusercontent.com/DaybreakContentKat/eoy-dash/main/public/data/snapshot.json';

export async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(SNAPSHOT_URL, { cache: 'no-store' });
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

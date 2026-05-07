import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Snapshot } from './types';

export async function loadSnapshot(): Promise<Snapshot> {
  const p = resolve(process.cwd(), 'public', 'data', 'snapshot.json');
  const raw = await readFile(p, 'utf-8');
  return JSON.parse(raw) as Snapshot;
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

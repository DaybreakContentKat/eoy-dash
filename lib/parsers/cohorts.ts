import type { Tier } from '../types';
import { normalizeDistrict } from './btsTracker';

export interface CohortRecord {
  district: string;
  accountOwner: string;
  csm: string;
  market: string;
  package: string;
  touchLevel: string;
  tier: Tier;
  cohortReason: string;
  ytdPacing: number | null;
  enrollment: number | null;
  notes: string;
}

const HEADER_HINTS = ['District', 'CSM', 'Training Cohort', 'Enrollment'];
const PROJECTED_DISTRICT_RE = /\bTBD\b/i;

/**
 * Parse the BTS_2026_Training_Cohorts sheet, which the Drive MCP exports as a
 * series of markdown tables. We pick the data tables (11 columns headed by
 * `District,Account Owner,CSM,Market,...,Notes`) and skip the cohort-summary
 * tables at the top. "Cohort 1/2/3" string values are mapped to the internal
 * Tier 1/2/3 type so downstream code keeps the same labels.
 */
export function parseCohorts(raw: string): CohortRecord[] {
  const out: CohortRecord[] = [];
  const seen = new Set<string>();

  for (const section of splitMarkdownSections(raw)) {
    if (!matchesAll(section.headers, HEADER_HINTS)) continue;
    const idx = indexHeaders(section.headers, {
      district: ['District'],
      accountOwner: ['Account Owner'],
      csm: ['CSM'],
      market: ['Market'],
      package: ['Package'],
      touchLevel: ['Touch Level'],
      cohort: ['Training Cohort'],
      cohortReason: ['Cohort Reason'],
      ytdPacing: ['YTD Pacing from 7/1/2025', 'YTD Pacing'],
      enrollment: ['Enrollment'],
      notes: ['Notes'],
    });

    for (const row of section.rows) {
      const district = (row[idx.district] ?? '').trim();
      if (!district) continue;
      if (PROJECTED_DISTRICT_RE.test(district)) continue;
      const tier = cohortToTier(row[idx.cohort]);
      if (!tier) continue;

      const key = normalizeDistrict(district);
      if (seen.has(key)) continue; // first occurrence wins
      seen.add(key);

      out.push({
        district,
        accountOwner: (row[idx.accountOwner] ?? '').trim(),
        csm: (row[idx.csm] ?? '').trim(),
        market: (row[idx.market] ?? '').trim(),
        package: (row[idx.package] ?? '').trim(),
        touchLevel: (row[idx.touchLevel] ?? '').trim(),
        tier,
        cohortReason: (row[idx.cohortReason] ?? '').trim(),
        ytdPacing: parseDecimal(row[idx.ytdPacing]),
        enrollment: parseDecimal(row[idx.enrollment]),
        notes: (row[idx.notes] ?? '').trim(),
      });
    }
  }

  return out;
}

function cohortToTier(raw: string | undefined): Tier | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'cohort 1' || v === 'tier 1') return 'Tier 1';
  if (v === 'cohort 2' || v === 'tier 2') return 'Tier 2';
  if (v === 'cohort 3' || v === 'tier 3') return 'Tier 3';
  return null;
}

interface MarkdownSection {
  headers: string[];
  rows: string[][];
}

function splitMarkdownSections(raw: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = raw.split('\n');
  let cur: MarkdownSection | null = null;
  let sawHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (cur && cur.rows.length > 0) sections.push(cur);
      cur = null;
      sawHeader = false;
      continue;
    }
    if (!trimmed.startsWith('|')) {
      if (cur && cur.rows.length > 0) sections.push(cur);
      cur = null;
      sawHeader = false;
      continue;
    }
    const cells = splitMarkdownRow(trimmed);
    if (!sawHeader) {
      cur = { headers: cells.map((c) => c.trim()), rows: [] };
      sawHeader = true;
      continue;
    }
    if (cells.every((c) => /^[-:\s]+$/.test(c))) continue;
    if (!cur) continue;
    cur.rows.push(cells.map((c) => c.trim()));
  }
  if (cur && cur.rows.length > 0) sections.push(cur);
  return sections;
}

function splitMarkdownRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|');
}

function matchesAll(headers: string[], hints: string[]): boolean {
  return hints.every((hint) =>
    headers.some((h) => h.toLowerCase() === hint.toLowerCase()),
  );
}

function indexHeaders<T extends string>(
  headers: string[],
  spec: Record<T, string[]>,
): Record<T, number> {
  const result: Record<string, number> = {};
  for (const [field, candidates] of Object.entries(spec) as [T, string[]][]) {
    const idx = headers.findIndex((h) =>
      candidates.some((c) => h.toLowerCase() === c.toLowerCase()),
    );
    result[field] = idx;
  }
  return result as Record<T, number>;
}

function parseDecimal(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

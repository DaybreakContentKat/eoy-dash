import type { ConcernCategory, UtilizationData } from '../types';
import { normalizeDistrict } from './btsTracker';

export interface InsuranceRow {
  district: string;
  school: string;
  status: string;
  healthPlanId: string;
  count: number;
}

export interface ConcernRow {
  district: string;
  school: string;
  category: string;
  patients: number;
}

export interface DistrictDataRaw {
  insurance: InsuranceRow[];
  concerns: ConcernRow[];
}

const INSURANCE_HEADER_HINTS = ['Health Plan ID', 'Status', 'Count'];
const CONCERNS_HEADER_HINTS = ['Category', 'Number of Patients'];

const IN_NETWORK_STATUS = 'in_network';
const BLOCKED_STATUSES = new Set([
  'expired',
  'coordination_of_benefits_issue',
  'failed_to_send_to_rcm',
]);

const TOP_CONCERNS_LIMIT = 3;

/**
 * Parse the District Data sheet, which the Drive MCP exports as several
 * markdown tables concatenated, separated by blank lines. We pull two of them:
 *
 *   - Insurance / Health Plan tab: (district, school, status, health_plan_id, count)
 *   - Top Concerns tab: (district, school, category, patient_count)
 *
 * Other tabs (Care Episodes, PHQ outcomes, GAD outcomes) are present but not
 * used by the dashboard yet — we just skip them.
 */
export function parseDistrictData(raw: string): DistrictDataRaw {
  const insurance: InsuranceRow[] = [];
  const concerns: ConcernRow[] = [];

  for (const section of splitMarkdownSections(raw)) {
    if (section.headers.length === 0) continue;
    if (matchesAll(section.headers, INSURANCE_HEADER_HINTS)) {
      const idx = indexHeaders(section.headers, {
        district: ['School District', 'District'],
        school: ['School'],
        status: ['Status'],
        healthPlanId: ['Health Plan ID', 'Health Plan'],
        count: ['Count'],
      });
      for (const row of section.rows) {
        const district = (row[idx.district] ?? '').trim();
        if (!district) continue;
        insurance.push({
          district,
          school: (row[idx.school] ?? '').trim(),
          status: normalizeStatus(row[idx.status]),
          healthPlanId: (row[idx.healthPlanId] ?? '').trim(),
          count: parseCount(row[idx.count]),
        });
      }
    } else if (matchesAll(section.headers, CONCERNS_HEADER_HINTS)) {
      const idx = indexHeaders(section.headers, {
        district: ['School District', 'District'],
        school: ['School'],
        category: ['Category'],
        patients: ['Number of Patients', 'Patients'],
      });
      for (const row of section.rows) {
        const district = (row[idx.district] ?? '').trim();
        if (!district) continue;
        concerns.push({
          district,
          school: (row[idx.school] ?? '').trim(),
          category: stripMarkdownEscapes((row[idx.category] ?? '').trim()),
          patients: parseCount(row[idx.patients]),
        });
      }
    }
  }

  return { insurance, concerns };
}

/**
 * Aggregate raw district-data rows to a per-district utilization map keyed by
 * normalized district name (matches the BTS tracker's join key). Districts
 * with no data in either source aren't in the map — the joiner sets utilization
 * to null for those.
 */
export function aggregateUtilization(data: DistrictDataRaw): Record<string, UtilizationData> {
  const out: Record<string, UtilizationData> = {};

  for (const row of data.insurance) {
    const key = normalizeDistrict(row.district);
    const u = out[key] ?? blankUtil();
    if (row.status === IN_NETWORK_STATUS) u.inNetworkStudents += row.count;
    else if (BLOCKED_STATUSES.has(row.status)) u.insuranceBlockedStudents += row.count;
    out[key] = u;
  }

  // Sum concern patients by (district, category) — schools collapse together.
  const concernsAcc = new Map<string, Map<string, number>>();
  for (const row of data.concerns) {
    const key = normalizeDistrict(row.district);
    if (!row.category) continue;
    const byCat = concernsAcc.get(key) ?? new Map();
    byCat.set(row.category, (byCat.get(row.category) ?? 0) + row.patients);
    concernsAcc.set(key, byCat);
  }

  for (const [key, byCat] of concernsAcc) {
    const top: ConcernCategory[] = [...byCat.entries()]
      .map(([category, patients]) => ({ category, patients }))
      .sort((a, b) => b.patients - a.patients)
      .slice(0, TOP_CONCERNS_LIMIT);
    out[key] = { ...(out[key] ?? blankUtil()), topConcerns: top };
  }

  for (const u of Object.values(out)) {
    const total = u.inNetworkStudents + u.insuranceBlockedStudents;
    u.insuranceBlockedPct = total > 0 ? u.insuranceBlockedStudents / total : 0;
  }

  return out;
}

function blankUtil(): UtilizationData {
  return {
    inNetworkStudents: 0,
    insuranceBlockedStudents: 0,
    insuranceBlockedPct: 0,
    topConcerns: [],
  };
}

interface MarkdownSection {
  headers: string[];
  rows: string[][];
}

/**
 * Split a markdown blob into table sections. Each section is `<header row>` +
 * optional `:-:` alignment row + data rows, separated from other sections by
 * blank lines or runs of non-table text.
 */
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
    if (cells.every((c) => /^[-:\s]+$/.test(c))) continue; // alignment row
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
    headers.some((h) => h.toLowerCase().includes(hint.toLowerCase())),
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

function parseCount(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[\\,]/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Markdown export wraps insurance status values like `\["in_network"\]` —
 * literal backslashes from markdown character escaping plus brackets and
 * quotes. Strip them all to get the bare enum value.
 */
function normalizeStatus(raw: string | undefined): string {
  if (!raw) return '';
  return stripMarkdownEscapes(raw)
    .replace(/[\[\]"']/g, '')
    .trim()
    .toLowerCase();
}

function stripMarkdownEscapes(s: string): string {
  return s.replace(/\\([_*+\-\[\]()])/g, '$1');
}

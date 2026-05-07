import { csmSlugFromName } from '../config';
import { EXCLUDED_DISTRICTS, OWNER_OVERRIDES } from '../overrides';
import type { District, MPOCMap, Tier, TierNum } from '../types';
import type { CohortRecord } from './cohorts';

const TRACKER_HEADER_ANCHOR =
  'District Name,Account Owner,Active Renewal? (Y/N),MPOC Name,Last Day of School';
const TRACKER_END_ANCHOR = 'Monicas Sheet';

const TRACKER_COLS = 18;

const STATUS_VALUES = ['⬜ Not Started', 'In Progress', 'On Track', 'At Risk', 'Done', 'Complete'];

// CSMs sometimes set Account Owner to a status word like "Churn", "Likely
// Churn", or "Onsite only" to mark a district that shouldn't be tracked here
// (no active EOY booking call needed). Drop those rows entirely.
const INACTIVE_OWNER_RE = /^(churn(ed)?|likely\s+churn|onsite(\s+only)?)\b/i;

export type ParsedDistrict = Pick<
  District,
  | 'name'
  | 'shortName'
  | 'owner'
  | 'activeRenewal'
  | 'lastDayOfSchool'
  | 'booked'
  | 'meetingDate'
  | 'outreachSent'
  | 'completed'
  | 'notes'
>;

export function parseBTSTracker(raw: string): ParsedDistrict[] {
  return parseTrackerSection(raw);
}

// Header detection is anchored on the last column header verbatim, because the
// natural-language Sheets export joins the last header cell to the first data
// cell with a single space (e.g. "Overall Status Adelanto Elementary School
// District"). We slice past the last header column and start tokenizing data.
const TRACKER_LAST_HEADER_COL = 'Notes / Flags,Overall Status';

function parseTrackerSection(raw: string): ParsedDistrict[] {
  const start = raw.indexOf(TRACKER_HEADER_ANCHOR);
  if (start < 0) throw new Error('BTS tracker header anchor not found');
  const headerEnd = raw.indexOf(TRACKER_LAST_HEADER_COL, start);
  if (headerEnd < 0) throw new Error('BTS tracker last header column not found');
  const dataStart = headerEnd + TRACKER_LAST_HEADER_COL.length;
  const end = raw.indexOf(TRACKER_END_ANCHOR, dataStart);
  const slice = (end > 0 ? raw.slice(dataStart, end) : raw.slice(dataStart)).replace(/^\s+/, '');

  const tokens = tokenizeQuoteAware(slice);
  const rows = groupTokensIntoRows(tokens, TRACKER_COLS);

  return rows
    .map((row) => rowToDistrict(row))
    .filter((d): d is ParsedDistrict => d !== null);
}

function rowToDistrict(row: string[]): ParsedDistrict | null {
  const name = (row[0] ?? '').trim();
  if (!name) return null;
  if (name.toLowerCase().startsWith('one row per district')) return null;

  const key = normalizeDistrict(name);
  if (EXCLUDED_DISTRICTS.has(key)) return null;

  const sheetOwner = (row[1] ?? '').trim();
  if (INACTIVE_OWNER_RE.test(sheetOwner)) return null;

  const owner = OWNER_OVERRIDES[key] ?? sheetOwner;

  const lastDayOfSchool = parseDate(row[4]);
  const yearOk = lastDayOfSchool ? new Date(lastDayOfSchool).getUTCFullYear() <= 2026 : true;

  return {
    name,
    shortName: shorten(name),
    owner,
    activeRenewal: yn(row[2]),
    lastDayOfSchool: yearOk ? lastDayOfSchool : null,
    booked: yn(row[6]),
    meetingDate: parseDate(row[7]),
    outreachSent: yn(row[8]),
    completed: yn(row[10]),
    notes: (row[16] ?? '').trim(),
  };
}

/**
 * Tokenizes a CSV-like string on commas, respecting double-quoted cells.
 * Doubled quotes ("") inside a quoted cell are interpreted as a literal quote.
 */
function tokenizeQuoteAware(text: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        tokens.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  tokens.push(cur);
  return tokens;
}

/**
 * Groups a flat token stream into rows of `cols` tokens. Critical wrinkle: in
 * the natural-language sheet representation, rows have no terminator — they're
 * separated by a single space. So when we hit the last token of a row, it may
 * actually contain `<row's last cell value> <next row's first cell value>`.
 * We split that token using a heuristic anchored on the known status enum
 * (Overall Status for the tracker; for the tiers section the last col is free
 * text and we accept the imprecision — we don't read those notes).
 */
function groupTokensIntoRows(tokens: string[], cols: number): string[][] {
  const rows: string[][] = [];
  let buf: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    buf.push(tokens[i]);
    i++;
    if (buf.length === cols) {
      const lastIdx = cols - 1;
      const last = buf[lastIdx];
      const split = splitLastCell(last);
      buf[lastIdx] = split.lastValue;
      rows.push(buf);
      buf = [];
      if (split.nextRowStart !== undefined) {
        // Re-inject the start of the next row's first cell.
        tokens.splice(i, 0, split.nextRowStart);
      }
    }
  }
  if (buf.length === cols) rows.push(buf);
  return rows;
}

function splitLastCell(token: string): { lastValue: string; nextRowStart?: string } {
  // Status-prefix split: "<status> <next district>"
  for (const status of STATUS_VALUES) {
    const prefix = status + ' ';
    if (token.startsWith(prefix)) {
      return { lastValue: status, nextRowStart: token.slice(prefix.length) };
    }
    // Bare status with no trailing content (last row of section)
    if (token === status) return { lastValue: status };
  }
  // Empty status case: token is " <next district>" (leading space) or just empty/whitespace.
  if (token.startsWith(' ')) {
    const rest = token.slice(1);
    if (rest.length === 0) return { lastValue: '' };
    return { lastValue: '', nextRowStart: rest };
  }
  // Last row, non-empty 18th value, no following row.
  return { lastValue: token };
}

function yn(v: string | undefined): boolean {
  if (!v) return false;
  return v.trim().toLowerCase().startsWith('y');
}

function parseDate(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (s.includes('#VALUE!') || /not stated/i.test(s)) return null;
  // Try common formats: M/D/YYYY, MM/DD/YYYY, M/D/YY, MM-DD-YYYY, "April 17"
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y ? (y.length === 2 ? Number('20' + y) : Number(y)) : 2026;
    return toIsoDate(year, Number(m), Number(d));
  }
  // Fallback: let JS Date parse, return ISO date if valid.
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shorten(name: string): string {
  return name
    .replace(/\s+(Unified|Joint Unified|Union|Elementary|High|Independent|Community|Charter|Public|Township|Consolidated)?\s*School District(\s*\(.*\))?$/i, '')
    .replace(/\s+School District$/i, '')
    .replace(/\s+\(District\)$/i, '')
    .replace(/\s+District$/i, '')
    .replace(/\s+Schools$/i, '')
    .trim();
}

export interface JoinedDistrict extends ParsedDistrict {
  tier: Tier;
  tierNum: TierNum;
  csm: string;
  csmSlug: string | null;
  mpocs: { name: string; email: string }[];
  enrollment: number | null;
  ytdPacing: number | null;
}

/**
 * Joins parsed districts with cohort records and MPOC contacts, applying the
 * default tier (Tier 2) for districts not in the cohort sheet. The dashboard
 * splits per CSM by **Account Owner** from the BTS tracker (who owns the
 * district relationship and runs outreach) — *not* the cohort sheet's CSM
 * column, which assigns the training lead and is a separate concept.
 */
export function joinDistricts(
  parsed: ParsedDistrict[],
  cohorts: CohortRecord[],
  mpocMap: MPOCMap,
): JoinedDistrict[] {
  const cohortsByDistrict = new Map<string, CohortRecord>();
  for (const c of cohorts) cohortsByDistrict.set(normalizeDistrict(c.district), c);

  return parsed.map((d) => {
    const key = normalizeDistrict(d.name);
    const cohort = cohortsByDistrict.get(key);
    const tier: Tier = cohort?.tier ?? 'Tier 2';
    const tierNum = tierToNum(tier);
    const csmSlug = csmSlugFromName(d.owner);
    const mpocs = mpocMap[key] ?? [];
    return {
      ...d,
      tier,
      tierNum,
      csm: d.owner,
      csmSlug,
      mpocs,
      enrollment: cohort?.enrollment ?? null,
      ytdPacing: cohort?.ytdPacing ?? null,
    };
  });
}

function tierToNum(t: Tier): TierNum {
  if (t === 'Tier 1') return 1;
  if (t === 'Tier 2') return 2;
  return 3;
}

export function normalizeDistrict(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

import { parse } from 'csv-parse/sync';
import type { MPOCContact, MPOCMap } from '../types';
import { normalizeDistrict } from './btsTracker';

interface MPOCRow {
  'Account Name': string;
  'Partnership Role': string;
  'First Name': string;
  'Last Name': string;
  Email: string;
}

const ROLE_PRIORITY: Record<string, number> = {
  'decision maker and project lead': 0,
  'decision maker': 1,
  'project lead': 2,
  'communications lead': 3,
};

const EXCLUDE_ROLES = new Set(['purchasing support']);
const MAX_CONTACTS_PER_DISTRICT = 2;

export function parseMPOCs(csv: string): MPOCMap {
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as MPOCRow[];

  const grouped = new Map<string, Array<{ contact: MPOCContact; priority: number }>>();

  for (const row of rows) {
    const district = row['Account Name']?.trim();
    const role = (row['Partnership Role'] ?? '').trim().toLowerCase();
    const first = (row['First Name'] ?? '').trim();
    const last = (row['Last Name'] ?? '').trim();
    const email = (row['Email'] ?? '').trim();
    if (!district || !email) continue;
    if (EXCLUDE_ROLES.has(role)) continue;
    const priority = ROLE_PRIORITY[role];
    if (priority === undefined) continue;

    const key = normalizeDistrict(district);
    const name = [first, last].filter(Boolean).join(' ') || email;
    const entry = { contact: { name, email }, priority };

    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }

  const out: MPOCMap = {};
  for (const [key, list] of grouped) {
    const sorted = list
      .sort((a, b) => a.priority - b.priority)
      .slice(0, MAX_CONTACTS_PER_DISTRICT)
      .map((e) => e.contact);
    out[key] = sorted;
  }
  return out;
}

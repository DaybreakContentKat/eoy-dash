import { normalizeDistrict } from './parsers/btsTracker';

/**
 * Manual overrides applied at parse time when the BTS tracker hasn't yet been
 * updated with a disposition for a district. Keep this list short and prefer
 * fixing the sheet — overrides go stale fast and can mask data-entry mistakes.
 */

const EXCLUDED_RAW = [
  // Confirmed by user 2026-05-07 — to be removed from the dashboard.
  'Fort Bragg Unified School District',
  'Humboldt County Office Of Education',
  'San Diego Unified School District',
];

const OWNER_RAW: Record<string, string> = {
  // Confirmed by user 2026-05-07 — assign to Monica until the sheet catches up.
  'Lake Elsinore Unified School District (all other campuses)': 'Monica Knott',
};

export const EXCLUDED_DISTRICTS: ReadonlySet<string> = new Set(
  EXCLUDED_RAW.map(normalizeDistrict),
);

export const OWNER_OVERRIDES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(OWNER_RAW).map(([k, v]) => [normalizeDistrict(k), v]),
);

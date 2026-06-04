// Types + loader for the BTS Readiness page. Kept separate from lib/types.ts /
// lib/snapshot.ts so those existing files aren't modified. bts.json is produced
// by scripts/generate_bts.py and served from GitHub raw, same as snapshot.json.

export type StatusState = 'green' | 'amber' | 'red';

export interface SchedStatus {
  label: string;
  state: StatusState;
}

export interface NoFormDistrict {
  name: string;
  shortName: string;
  tier: number;
  ldos: string | null;
}

// One unmet required field: the column name + exactly what the CSM entered.
export interface GapItem {
  field: string;
  value: string;
}

// Every submitted+matched district. gapCount/gaps are an overlay — a submitted
// form counts as submitted regardless of how many gaps it has.
export interface SubmittedDistrict {
  name: string;
  tier: number | string;
  gapCount: number;
  gaps: GapItem[];
  coOwned: boolean;
  formOwner: string | null;
  trainingStatus?: SchedStatus;
  kickoffStatus?: SchedStatus;
  staffFileStatus?: SchedStatus;
  trainingDate?: string;
  familyComms?: string;
  unmatched?: boolean;
}

export interface MissingDistrict {
  name: string;
  tier: number | string;
  gapCount: number;
  missingFields: string[];
  gaps?: GapItem[];
  trainingStatus: SchedStatus | null;
  kickoffStatus: SchedStatus | null;
  coOwned: boolean;
  formOwner: string | null;
  unmatched?: boolean;
}

export interface CompleteDistrict {
  name: string;
  tier: number | string;
  coOwned: boolean;
  formOwner: string | null;
  trainingStatus?: SchedStatus;
  kickoffStatus?: SchedStatus;
  staffFileStatus?: SchedStatus;
  familyComms?: string;
}

// Per-tier rollup used by the owner summary tables and the portfolio header.
export interface TierCount {
  total: number;
  noForm: number;
  submitted: number;
  withGaps: number;
}

export interface OwnerGroups {
  noForm: NoFormDistrict[];
  missing: MissingDistrict[];
  complete: CompleteDistrict[];
  submitted: SubmittedDistrict[];
  byTier: Record<string, TierCount>;
}

export interface SchedulingRow {
  district: string;
  owner: string;
  trainingScheduled: SchedStatus;
  trainingDate: string;
  kickoffStatus: SchedStatus;
  staffFileStatus: SchedStatus;
}

export interface BtsTotals {
  totalDistricts: number;
  formsSubmitted: number;
  formsWithGaps: number;
  formsClean: number;
  t1t2Total: number;
  t1t2Complete: number;
  t3Total: number;
  t3Complete: number;
  withGaps: number;
  unmatchedCount: number;
  tierSummary: Record<string, TierCount>;
}

export interface BtsData {
  refreshedAt: string;
  totals: BtsTotals;
  ownerOrder: string[];
  owners: Record<string, OwnerGroups>;
  scheduling: SchedulingRow[];
  unmatched: string[];
}

const BTS_URL_BASE =
  'https://raw.githubusercontent.com/DaybreakContentKat/eoy-dash/main/public/data/bts.json';

export async function loadBts(): Promise<BtsData> {
  const bucket = Math.floor(Date.now() / 60_000);
  const res = await fetch(`${BTS_URL_BASE}?t=${bucket}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load bts.json: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as BtsData;
}

// The 4 CSM tabs (Unknown bucket only shows under "All").
export const BTS_OWNER_TABS = [
  'Brianna Masciel',
  'Sarah Hough',
  'Monica Knott',
  'Daisy Leahy',
];

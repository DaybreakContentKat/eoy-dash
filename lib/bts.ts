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

export interface MissingDistrict {
  name: string;
  tier: number | string;
  gapCount: number;
  missingFields: string[];
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

export interface OwnerGroups {
  noForm: NoFormDistrict[];
  missing: MissingDistrict[];
  complete: CompleteDistrict[];
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
  t1t2Total: number;
  t1t2Complete: number;
  t3Total: number;
  t3Complete: number;
  withGaps: number;
  unmatchedCount: number;
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

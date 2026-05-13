export type CardStatus =
  | 'overdue'
  | 'schedule-soon'
  | 'booked'
  | 'async'
  | 'completed';

export type MeetingType = 'live' | 'async';

export type Tier = 'Tier 1' | 'Tier 2' | 'Tier 3';
export type TierNum = 1 | 2 | 3;

export interface ConcernCategory {
  category: string;
  patients: number;
}

export interface UpsellData {
  // From Looker District Health Plan, 2026-05-12 snapshot (static — not refreshed daily).
  uninsured: number;
  uninsuredPct: number;
  oon: number;
  oonPct: number;
  totalPatients: number;
  combinedPct: number;
}

export interface UtilizationData {
  // From the Insurance / Health Plan tab — students per district summed across schools.
  inNetworkStudents: number;
  insuranceBlockedStudents: number;
  insuranceBlockedPct: number; // blocked / (blocked + in-network); 0 when denominator is 0
  // From the Top Concerns / Categories tab — top 3 presenting categories by patient count.
  topConcerns: ConcernCategory[];
  // Optional fields — populated when enrollment data is wired in from a separate source.
  totalEnrolled?: number;
  completedSessions?: number;
  avgSessionsPerStudent?: number;
}

export interface MPOCContact {
  name: string;
  email: string;
}

export type MPOCMap = Record<string, MPOCContact[]>;

export interface District {
  name: string;
  shortName: string;
  owner: string;
  csm: string;
  tier: Tier;
  tierNum: TierNum;
  meetingType: MeetingType;
  activeRenewal: boolean;
  lastDayOfSchool: string | null;
  bookingTarget: string | null;
  booked: boolean;
  meetingDate: string | null;
  outreachSent: boolean;
  asyncFormSent: string | null;
  completed: boolean;
  notes: string;
  status: CardStatus;
  overdue: boolean;
  utilization: UtilizationData | null;
  isUpsellCandidate: boolean;
  upsellData: UpsellData | null;
  mpocs: MPOCContact[];
  enrollment: number | null;
  ytdPacing: number | null;
}

export interface UrgencyBuckets {
  thisWeek: District[];
  nextWeek: District[];
  soon: District[];
  later: District[];
  noDate: District[];
}

export interface GapToGoal {
  totalNeedingCall: number;
  booked: number;
  completed: number;
  unbooked: number;
  weeklyTarget: number;
  thisWeekUrgent: number;
  atRisk: number;
  byUrgency: UrgencyBuckets;
}

export interface TierStats {
  total: number;
  completed: number;
  booked: number;
  remaining: number;
  overdue: number;
}

export interface PortfolioStats {
  totalT1T2: number;
  completed: number;
  booked: number;
  outreachSent: number;
  overdue: number;
  upsellCandidates: number;
  byTier: Record<TierNum, TierStats>;
}

export interface CSMConfig {
  fullName: string;
  firstName: string;
  calendly: string;
  slug: string;
}

export interface CSMSnapshot {
  districts: District[];
  gapToGoal: GapToGoal;
  stats: PortfolioStats;
}

export interface Snapshot {
  refreshedAt: string;
  stale: boolean;
  portfolio: {
    gapToGoal: GapToGoal;
    stats: PortfolioStats;
  };
  csms: Record<string, CSMSnapshot>;
  orphans: District[];
}

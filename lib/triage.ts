import {
  BOOKING_WINDOW_DAYS_BEFORE_LDOS,
  UPSELL_INSURANCE_BLOCKED_PCT_THRESHOLD,
  UPSELL_MIN_INSURANCE_SAMPLE,
} from './config';
import type {
  CardStatus,
  District,
  GapToGoal,
  PortfolioStats,
  TierNum,
  TierStats,
  UrgencyBuckets,
  UtilizationData,
} from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function utcMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function todayUtcMidnight(today: Date): number {
  return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

function daysBetween(laterIso: string, earlier: Date): number {
  return Math.round((utcMidnight(laterIso) - todayUtcMidnight(earlier)) / MS_PER_DAY);
}

export function bookingTargetFor(lastDayOfSchool: string | null): string | null {
  if (!lastDayOfSchool) return null;
  const ms = utcMidnight(lastDayOfSchool) - BOOKING_WINDOW_DAYS_BEFORE_LDOS * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

export function isOverdue(d: District, today: Date): boolean {
  if (d.booked || d.completed || !d.bookingTarget) return false;
  return todayUtcMidnight(today) > utcMidnight(d.bookingTarget);
}

export function isUpsellCandidate(util: UtilizationData | null): boolean {
  if (!util) return false;
  const sample = util.inNetworkStudents + util.insuranceBlockedStudents;
  if (sample < UPSELL_MIN_INSURANCE_SAMPLE) return false;
  return util.insuranceBlockedPct >= UPSELL_INSURANCE_BLOCKED_PCT_THRESHOLD;
}

export function getStatus(d: District, today: Date): CardStatus {
  if (d.completed) return 'completed';
  if (d.meetingType === 'async') return 'async';
  if (isOverdue(d, today)) return 'overdue';
  if (d.booked) return 'booked';
  return 'schedule-soon';
}

export function annotateDistrict(d: District, today: Date): District {
  return {
    ...d,
    overdue: isOverdue(d, today),
    status: getStatus(d, today),
    isUpsellCandidate: isUpsellCandidate(d.utilization),
  };
}

export function gapToGoal(districts: District[], today: Date): GapToGoal {
  const needsCalls = districts.filter((d) => !d.completed && d.tierNum <= 2);
  const unbooked = needsCalls.filter((d) => !d.booked);

  const byUrgency: UrgencyBuckets = unbooked.reduce<UrgencyBuckets>(
    (acc, d) => {
      if (!d.bookingTarget) {
        acc.noDate.push(d);
        return acc;
      }
      const days = daysBetween(d.bookingTarget, today);
      const weeksLeft = Math.max(0, Math.floor(days / 7));
      if (weeksLeft === 0) acc.thisWeek.push(d);
      else if (weeksLeft === 1) acc.nextWeek.push(d);
      else if (weeksLeft <= 3) acc.soon.push(d);
      else acc.later.push(d);
      return acc;
    },
    { thisWeek: [], nextWeek: [], soon: [], later: [], noDate: [] },
  );

  const weeklyTarget = computeWeeklyTarget(unbooked, today);
  const atRisk = unbooked.filter(
    (d) => d.bookingTarget && daysBetween(d.bookingTarget, today) < 7,
  ).length;

  return {
    totalNeedingCall: needsCalls.length,
    booked: needsCalls.filter((d) => d.booked).length,
    completed: districts.filter((d) => d.completed).length,
    unbooked: unbooked.length,
    weeklyTarget,
    thisWeekUrgent: byUrgency.thisWeek.length,
    atRisk,
    byUrgency,
  };
}

/**
 * "Book X per week to hit 100% before school ends." Spread the unbooked count
 * across the average weeks each district has left in its booking window. If
 * targets are very close, weeklyTarget rises to match — that's the signal that
 * the team is behind.
 */
function computeWeeklyTarget(unbooked: District[], today: Date): number {
  if (unbooked.length === 0) return 0;
  const totalWeeks = unbooked.reduce((sum, d) => {
    if (!d.bookingTarget) return sum + 4;
    const days = daysBetween(d.bookingTarget, today);
    return sum + Math.max(1, Math.floor(days / 7));
  }, 0);
  const avgWeeksPerDistrict = totalWeeks / unbooked.length;
  return Math.ceil(unbooked.length / Math.max(1, avgWeeksPerDistrict));
}

export function tierStats(districts: District[]): Record<TierNum, TierStats> {
  const empty = (): TierStats => ({
    total: 0,
    completed: 0,
    booked: 0,
    remaining: 0,
    overdue: 0,
  });
  const out: Record<TierNum, TierStats> = { 1: empty(), 2: empty(), 3: empty() };
  for (const d of districts) {
    const t = out[d.tierNum];
    t.total++;
    if (d.completed) t.completed++;
    if (d.booked) t.booked++;
    if (!d.completed && !d.booked) t.remaining++;
    if (d.overdue) t.overdue++;
  }
  return out;
}

export function portfolioStats(districts: District[]): PortfolioStats {
  const t1t2 = districts.filter((d) => d.tierNum <= 2);
  return {
    totalT1T2: t1t2.length,
    completed: t1t2.filter((d) => d.completed).length,
    booked: t1t2.filter((d) => d.booked).length,
    outreachSent: t1t2.filter((d) => d.outreachSent).length,
    overdue: t1t2.filter((d) => d.overdue).length,
    upsellCandidates: districts.filter((d) => d.isUpsellCandidate).length,
    byTier: tierStats(districts),
  };
}

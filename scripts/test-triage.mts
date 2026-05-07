import {
  annotateDistrict,
  bookingTargetFor,
  gapToGoal,
  getStatus,
  isOverdue,
  isUpsellCandidate,
  portfolioStats,
} from '../lib/triage.ts';
import type { District } from '../lib/types.ts';

const TODAY = new Date('2026-05-07T12:00:00Z');

function makeDistrict(overrides: Partial<District> = {}): District {
  return {
    name: 'Test District',
    shortName: 'Test',
    owner: 'Brianna Masciel',
    csm: 'Brianna Masciel',
    tier: 'Tier 2',
    tierNum: 2,
    activeRenewal: false,
    lastDayOfSchool: '2026-06-04',
    bookingTarget: '2026-05-07',
    booked: false,
    meetingDate: null,
    outreachSent: false,
    completed: false,
    notes: '',
    status: 'schedule-soon',
    overdue: false,
    utilization: null,
    isUpsellCandidate: false,
    mpocs: [],
    enrollment: null,
    ytdPacing: null,
    ...overrides,
  };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('  OK:', msg);
}

console.log('--- bookingTargetFor ---');
assert(bookingTargetFor('2026-06-04') === '2026-05-07', 'LDoS 6/4 → booking target 5/7 (28 days back)');
assert(bookingTargetFor(null) === null, 'null LDoS → null target');

console.log('\n--- isOverdue ---');
assert(
  isOverdue(makeDistrict({ bookingTarget: '2026-04-01' }), TODAY),
  'past booking target, not booked, not completed → overdue',
);
assert(
  !isOverdue(makeDistrict({ bookingTarget: '2026-04-01', booked: true }), TODAY),
  'booked → not overdue',
);
assert(
  !isOverdue(makeDistrict({ bookingTarget: '2026-04-01', completed: true }), TODAY),
  'completed → not overdue',
);
assert(
  !isOverdue(makeDistrict({ bookingTarget: '2026-06-01' }), TODAY),
  'booking target in future → not overdue',
);

console.log('\n--- getStatus precedence ---');
assert(getStatus(makeDistrict({ completed: true }), TODAY) === 'completed', 'completed > all');
assert(getStatus(makeDistrict({ tierNum: 3 }), TODAY) === 't3-async', 'tier 3 → async (not booked, not completed)');
assert(
  getStatus(
    makeDistrict({ tierNum: 3, completed: true }),
    TODAY,
  ) === 'completed',
  'tier 3 + completed → completed (completed wins)',
);
assert(
  getStatus(makeDistrict({ bookingTarget: '2026-04-01' }), TODAY) === 'overdue',
  'past target, unbooked → overdue',
);
assert(
  getStatus(
    makeDistrict({ bookingTarget: '2026-04-01', booked: true, meetingDate: '2026-05-15' }),
    TODAY,
  ) === 'booked',
  'past target but booked → booked (booked wins over overdue)',
);
assert(
  getStatus(makeDistrict({ bookingTarget: '2026-06-01' }), TODAY) === 'schedule-soon',
  'future target, unbooked → schedule-soon',
);

console.log('\n--- isUpsellCandidate ---');
assert(!isUpsellCandidate(null), 'no utilization → not upsell');
assert(
  isUpsellCandidate({
    inNetworkStudents: 50,
    insuranceBlockedStudents: 10,
    insuranceBlockedPct: 10 / 60,
    topConcerns: [],
  }),
  'blocked pct ≥ 15% (16.7%) with 60-student sample → upsell',
);
assert(
  !isUpsellCandidate({
    inNetworkStudents: 100,
    insuranceBlockedStudents: 5,
    insuranceBlockedPct: 5 / 105,
    topConcerns: [],
  }),
  'blocked pct < 15% (4.8%) → not upsell',
);
assert(
  !isUpsellCandidate({
    inNetworkStudents: 0,
    insuranceBlockedStudents: 1,
    insuranceBlockedPct: 1,
    topConcerns: [],
  }),
  'sample too small (1 student) → not upsell even at 100% blocked',
);
assert(
  !isUpsellCandidate({
    inNetworkStudents: 0,
    insuranceBlockedStudents: 0,
    insuranceBlockedPct: 0,
    topConcerns: [],
  }),
  'no insurance data → not upsell',
);

console.log('\n--- annotateDistrict / gapToGoal portfolio ---');
const districts = [
  annotateDistrict(makeDistrict({ name: 'A', tierNum: 1, tier: 'Tier 1', bookingTarget: '2026-04-15' }), TODAY),
  annotateDistrict(makeDistrict({ name: 'B', tierNum: 1, tier: 'Tier 1', booked: true, meetingDate: '2026-05-20' }), TODAY),
  annotateDistrict(makeDistrict({ name: 'C', tierNum: 2, tier: 'Tier 2', completed: true }), TODAY),
  annotateDistrict(makeDistrict({ name: 'D', tierNum: 2, tier: 'Tier 2', bookingTarget: '2026-05-12' }), TODAY),
  annotateDistrict(
    makeDistrict({
      name: 'E',
      tierNum: 2,
      tier: 'Tier 2',
      outreachSent: true,
      bookingTarget: '2026-06-01',
    }),
    TODAY,
  ),
  annotateDistrict(makeDistrict({ name: 'F', tierNum: 3, tier: 'Tier 3' }), TODAY),
];

const stats = portfolioStats(districts);
console.log('  portfolioStats:', stats);
assert(stats.totalT1T2 === 5, '5 T1+T2 districts');
assert(stats.completed === 1, '1 completed (C)');
assert(stats.booked === 1, '1 booked (B)');
assert(stats.overdue === 1, '1 overdue (A)');

const gtg = gapToGoal(districts, TODAY);
console.log('  gapToGoal:', { ...gtg, byUrgency: 'omitted' });
assert(gtg.totalNeedingCall === 4, '4 need call (A, B, D, E — C done, F is T3)');
assert(gtg.unbooked === 3, '3 unbooked (A, D, E — B is booked)');
assert(gtg.booked === 1, '1 booked among needs-call (B)');
assert(gtg.weeklyTarget >= 1, 'weeklyTarget computed');

console.log('\n✓ all triage tests passed');

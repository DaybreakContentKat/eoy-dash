import { parseCohorts } from '../lib/parsers/cohorts.ts';

// Fixture distilled from the real BTS_2026_Training_Cohorts export. Exercises:
// - Multiple data tables back-to-back
// - Summary tables at top (different shape) skipped
// - "Cohort N" → "Tier N" mapping
// - Enrollment with comma thousands separators
// - YTD Pacing decimals
// - PROJECTED NEW DISTRICTS (TBD) rows skipped
const FIXTURE = `| Cohort 1 | 62 districts  | Moderate + Unlimited |  |
| :-: | :-: | :-: | :-: |
| Cohort 2 | 67 districts | Moderate + No Cost |  |
| Cohort 3 | 75 districts | Low / Lower Touch |  |

| District | Account Owner | CSM | Market | Package | Touch Level | Training Cohort | Cohort Reason | YTD Pacing from 7/1/2025 | Enrollment | Notes |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Adelanto Elementary School District | Daisy Leahy | Brianna Masciel | California | Unlimited | Moderate | Cohort 1 | Moderate + Unlimited | 0.56 | 7,440 |  |
| Antelope Valley Union High School District | Daisy Leahy | Sarah Hough | California | Unlimited | Moderate | Cohort 1 | Moderate + Unlimited | 0.60 | 27,782 |  |
| Effingham County School District | Monica Knott | Sarah Hough | Georgia | Unlimited | Moderate | Cohort 1 | Moderate + Unlimited | 0.11 | 15,352 | May be able to drop a tier if needed, will know more end of May |
| New District 1 (TBD) |  |  |  |  |  | Cohort 1 | New District (Apr 2026+) |  |  |  |
| New District 2 (TBD) |  |  |  |  |  | Cohort 1 | New District (Apr 2026+) |  |  |  |

| District | Account Owner | CSM | Market | Package | Touch Level | Training Cohort | Cohort Reason | YTD Pacing from 7/1/2025 | Enrollment | Notes |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Lompoc Unified School District | Brianna Masciel | Brianna Masciel | California | No Cost | Moderate | Cohort 2 | Moderate + No Cost | 0.10 | 9,697 |  |
| Adelanto Elementary School District | Daisy Leahy | Brianna Masciel | California | Unlimited | Moderate | Cohort 1 | Duplicate (should be skipped) | 0.99 | 99,999 |  |

| District | Account Owner | CSM | Market | Package | Touch Level | Training Cohort | Cohort Reason | YTD Pacing from 7/1/2025 | Enrollment | Notes |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Cobb County School District | Monica Knott | Sarah Hough | Georgia | Unlimited | Lower | Cohort 3 | Lower Touch | 0.61 | 107,994 | move to tier 1 |
`;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('  OK:', msg);
}

console.log('--- parseCohorts ---');
const cohorts = parseCohorts(FIXTURE);
console.log(`  parsed ${cohorts.length} cohort records`);
console.log(cohorts.map((c) => `  ${c.tier}: ${c.district} (CSM ${c.csm}, enrolled ${c.enrollment}, pacing ${c.ytdPacing})`).join('\n'));

assert(cohorts.length === 5, 'parsed 5 records (Adelanto + Antelope Valley + Effingham + Lompoc + Cobb; skipped 2 TBD and 1 duplicate Adelanto)');
const byName = Object.fromEntries(cohorts.map((c) => [c.district, c]));
assert(byName['Adelanto Elementary School District'].tier === 'Tier 1', 'Cohort 1 → Tier 1');
assert(byName['Lompoc Unified School District'].tier === 'Tier 2', 'Cohort 2 → Tier 2');
assert(byName['Cobb County School District'].tier === 'Tier 3', 'Cohort 3 → Tier 3');
assert(byName['Adelanto Elementary School District'].csm === 'Brianna Masciel', 'Adelanto CSM = Brianna');
assert(byName['Adelanto Elementary School District'].enrollment === 7440, 'Adelanto enrollment = 7440 (comma stripped)');
assert(Math.abs((byName['Adelanto Elementary School District'].ytdPacing ?? 0) - 0.56) < 0.001, 'Adelanto YTD pacing = 0.56');
assert(byName['Cobb County School District'].enrollment === 107994, 'Cobb enrollment = 107994');
assert(byName['Effingham County School District'].notes.includes('drop a tier'), 'Notes preserved with embedded commas');
assert(!cohorts.some((c) => c.district.includes('TBD')), 'TBD projected districts skipped');
assert(byName['Adelanto Elementary School District'].cohortReason === 'Moderate + Unlimited', 'Adelanto first occurrence wins (not duplicate)');

console.log('\n✓ all cohort tests passed');

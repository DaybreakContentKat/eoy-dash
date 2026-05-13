import {
  aggregateUtilization,
  parseDistrictData,
} from '../lib/parsers/districtData.ts';
import { normalizeDistrict } from '../lib/parsers/btsTracker.ts';

// Fixture distilled from the real markdown export. Includes:
// - Insurance tab with bracket-escaped status values
// - Top concerns tab with markdown-escaped underscores in category names
// - One district that's blocked-rate above the 15% threshold
// - One district that's below
// - One district with concerns but no insurance data
const FIXTURE = `# District Data 25-26 SY.csv

| Care Episodes School | Care Episodes School District | Care Episodes ID |
| :-: | :-: | :-: |
| Some School | Some District | abc-123 |

| Outcome PHQ | Program | School | School District | Care Requested Date | Created Date |
| :-: | :-: | :-: | :-: | :-: | :-: |
| Improved | Therapy | Some School | Some District | 2026-04-01 | 2026-04-01 |

| School District | School | Status | Health Plan ID | Count |
| :-: | :-: | :-: | :-: | :-: |
| Lompoc Unified School District | Lompoc HS | \\["in_network"\\] | AETNA | 30 |
| Lompoc Unified School District | Lompoc Middle | \\["in_network"\\] | BCBS | 20 |
| Lompoc Unified School District | Lompoc HS | \\["expired"\\] | AETNA | 5 |
| Lompoc Unified School District | Lompoc HS | \\["coordination_of_benefits_issue"\\] | BCBS | 4 |
| Lompoc Unified School District | Lompoc Middle | \\["failed_to_send_to_rcm"\\] | UHC | 1 |
| Adelanto Elementary School District | Adelanto K-5 | \\["in_network"\\] | AETNA | 90 |
| Adelanto Elementary School District | Adelanto K-5 | \\["expired"\\] | AETNA | 2 |

| School District | School | Category | Number of Patients |
| :-: | :-: | :-: | :-: |
| Lompoc Unified School District | Lompoc HS | Mood Issues | 12 |
| Lompoc Unified School District | Lompoc Middle | Mood Issues | 8 |
| Lompoc Unified School District | Lompoc HS | Trauma | 7 |
| Lompoc Unified School District | Lompoc HS | Self Harm | 3 |
| Adelanto Elementary School District | Adelanto K-5 | Anxiety | 4 |
| Beaumont Unified School District | Beaumont MS | Mood Issues | 6 |
`;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('  OK:', msg);
}

console.log('--- parseDistrictData ---');
const parsed = parseDistrictData(FIXTURE);
console.log(`  insurance rows: ${parsed.insurance.length}, concern rows: ${parsed.concerns.length}`);
assert(parsed.insurance.length === 7, '7 insurance rows parsed');
assert(parsed.concerns.length === 6, '6 concern rows parsed');
assert(parsed.insurance[0].status === 'in_network', 'status normalized: in_network');
assert(parsed.insurance[2].status === 'expired', 'status normalized: expired');
assert(parsed.insurance[3].status === 'coordination_of_benefits_issue', 'status normalized: coordination_of_benefits_issue');
assert(parsed.insurance[0].count === 30, 'count parsed as number');

console.log('\n--- aggregateUtilization ---');
const util = aggregateUtilization(parsed);
const lompocKey = normalizeDistrict('Lompoc Unified School District');
const adelantoKey = normalizeDistrict('Adelanto Elementary School District');
const beaumontKey = normalizeDistrict('Beaumont Unified School District');
console.log('  Lompoc:', util[lompocKey]);
console.log('  Adelanto:', util[adelantoKey]);
console.log('  Beaumont:', util[beaumontKey]);

assert(util[lompocKey].inNetworkStudents === 50, 'Lompoc in-network = 30 + 20');
assert(util[lompocKey].insuranceBlockedStudents === 10, 'Lompoc blocked = 5 + 4 + 1');
assert(
  Math.abs(util[lompocKey].insuranceBlockedPct - 10 / 60) < 0.001,
  'Lompoc blocked pct = 10/60 = 16.7%',
);
assert(util[lompocKey].topConcerns.length === 3, 'Lompoc has 3 top concerns');
assert(util[lompocKey].topConcerns[0].category === 'Mood Issues' && util[lompocKey].topConcerns[0].patients === 20, 'Lompoc top concern: Mood Issues, 20 patients (12+8)');
assert(util[lompocKey].topConcerns[1].category === 'Trauma' && util[lompocKey].topConcerns[1].patients === 7, 'Lompoc 2nd: Trauma, 7');

assert(util[adelantoKey].inNetworkStudents === 90, 'Adelanto in-network = 90');
assert(util[adelantoKey].insuranceBlockedStudents === 2, 'Adelanto blocked = 2');
assert(
  Math.abs(util[adelantoKey].insuranceBlockedPct - 2 / 92) < 0.001,
  'Adelanto blocked pct = 2/92 ≈ 2.2%',
);

assert(util[beaumontKey].inNetworkStudents === 0, 'Beaumont has no insurance data');
assert(util[beaumontKey].topConcerns.length === 1, 'Beaumont still gets top concerns from concerns sheet');

console.log('\n✓ all district-data tests passed');

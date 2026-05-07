import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { joinDistricts, normalizeDistrict, parseBTSTracker } from '../lib/parsers/btsTracker.ts';
import type { CohortRecord } from '../lib/parsers/cohorts.ts';
import { parseMPOCs } from '../lib/parsers/mpocs.ts';

// A fixture distilled from real BTS tracker text. Exercises:
// - Header detection
// - Section end at "Monicas Sheet"
// - Row with empty Overall Status  -> ", , " separator pattern
// - Row with "⬜ Not Started" status -> status + space + next district pattern
// - Row with quoted notes containing a comma
const FIXTURE = `District Name,Account Owner,Active Renewal? (Y/N),MPOC Name,Last Day of School,EOY Call Target Date,"EOY Meeting Booked (Y/N)",EOY Meeting Date (XX/XX/2026),EOY Outreach Sent? (Y/N),Last Outreach Sent Date (for nudges),"EOY Meeting Completed (Y/N)","August Kickoff Scheduled (Y/N)","August Training Scheduled (Y/N)","Staff File Received / EdLink Confirmed (Y/N)","Summer Contact Name + Email","District Return Date",Notes / Flags,Overall Status Adelanto Elementary School District,Daisy Leahy,Y,,6/2/2026,5/12/2026,,,,,,,,,,,,⬜ Not Started Lompoc Unified School District,Brianna Masciel,,,6/4/2026,5/14/2026,Y,5/28/26,,,,,,,,,, Cobb County School District,Monica Knott,,Kelly McNabb,5/20/2026,4/29/2026,N/A,N/A,N/A,N/A,N/A,pending,07/28/26,,,,"Treat like new launch. This year we partner at only 1 school in Cobb, next year we will be going district wide ", Beaumont Unified School District,Brianna Masciel,,,6/4/2026,5/14/2026,,,Y,4/15/2026,,,,,,,, Monicas Sheet ð BTS 2026 — District-Level Spring Outreach Tracker`;

const MPOC_FIXTURE = `"Account Name","Partnership Role","First Name","Last Name","Title","Phone","Mobile","Email","Account Owner","State","Customer Lifecycle Stage"
"Adelanto Elementary School District","Decision Maker","Jane","Doe","Director","","","jane@adelanto.org","Daisy Leahy","CA","Launch"
"Adelanto Elementary School District","Communications Lead","Bob","Smith","Coord","","","bob@adelanto.org","Daisy Leahy","CA","Launch"
"Adelanto Elementary School District","Project Lead","Kim","Lee","Manager","","","kim@adelanto.org","Daisy Leahy","CA","Launch"
"Adelanto Elementary School District","Purchasing Support","Pat","Buyer","Buyer","","","pat@adelanto.org","Daisy Leahy","CA","Launch"
"Lompoc Unified School District","Decision Maker and Project Lead","Adriana","Uribe Colima","Asst Supt","","","uribecolima.adriana@lusd.org","Brianna Masciel","CA","Renewal"
`;

// Cohort fixture — replaces the in-BTS tier section. Adelanto is Tier 1 with
// CSM Brianna (owner is Daisy — the join should prefer cohort CSM). Lompoc and
// Cobb are Tier 2; Beaumont is intentionally absent so we exercise the default.
const COHORT_FIXTURE: CohortRecord[] = [
  {
    district: 'Adelanto Elementary School District',
    accountOwner: 'Daisy Leahy',
    csm: 'Brianna Masciel',
    market: 'California',
    package: 'Unlimited',
    touchLevel: 'Moderate',
    tier: 'Tier 1',
    cohortReason: 'Moderate + Unlimited',
    ytdPacing: 0.56,
    enrollment: 7440,
    notes: '',
  },
  {
    district: 'Lompoc Unified School District',
    accountOwner: 'Brianna Masciel',
    csm: 'Brianna Masciel',
    market: 'California',
    package: 'No Cost',
    touchLevel: 'Moderate',
    tier: 'Tier 2',
    cohortReason: 'Moderate + No Cost',
    ytdPacing: 0.1,
    enrollment: 9697,
    notes: '',
  },
  {
    district: 'Cobb County School District',
    accountOwner: 'Monica Knott',
    csm: 'Sarah Hough',
    market: 'Georgia',
    package: 'Unlimited',
    touchLevel: 'Lower',
    tier: 'Tier 3',
    cohortReason: 'Lower Touch',
    ytdPacing: 0.61,
    enrollment: 107994,
    notes: 'move to tier 1',
  },
];

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('  OK:', msg);
}

function loadCachedRawIfPresent(): string | null {
  const p = resolve(process.cwd(), '.cache/bts-tracker.txt');
  try {
    return readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

console.log('--- BTS tracker (fixture) ---');
const districts = parseBTSTracker(FIXTURE);
console.log(`  parsed ${districts.length} districts`);
assert(districts.length === 4, 'parsed 4 districts (Adelanto, Lompoc, Cobb, Beaumont)');
const byName = Object.fromEntries(districts.map((d) => [d.name, d]));
assert(!!byName['Adelanto Elementary School District'], 'Adelanto present');
assert(!!byName['Lompoc Unified School District'], 'Lompoc present');
assert(!!byName['Cobb County School District'], 'Cobb present');
assert(!!byName['Beaumont Unified School District'], 'Beaumont present');
assert(byName['Adelanto Elementary School District'].owner === 'Daisy Leahy', 'Adelanto owner = Daisy');
assert(byName['Lompoc Unified School District'].booked === true, 'Lompoc booked = true');
assert(byName['Cobb County School District'].notes.includes('Treat like new launch'), 'Cobb notes include quoted text');
assert(byName['Cobb County School District'].notes.includes('Cobb, next year'), 'Cobb notes preserve embedded comma');
assert(byName['Beaumont Unified School District'].outreachSent === true, 'Beaumont outreach sent');
assert(byName['Adelanto Elementary School District'].lastDayOfSchool === '2026-06-02', 'Adelanto LDoS parsed');

console.log('\n--- MPOCs ---');
const mpocs = parseMPOCs(MPOC_FIXTURE);
const adelantoKey = normalizeDistrict('Adelanto Elementary School District');
const lompocKey = normalizeDistrict('Lompoc Unified School District');
console.log('  Adelanto:', mpocs[adelantoKey]);
console.log('  Lompoc:', mpocs[lompocKey]);
assert(mpocs[adelantoKey].length === 2, 'Adelanto has max 2 contacts');
assert(mpocs[adelantoKey][0].email === 'jane@adelanto.org', 'Adelanto top contact = Decision Maker (Jane)');
assert(mpocs[adelantoKey][1].email === 'kim@adelanto.org', 'Adelanto 2nd = Project Lead (Kim) — Communications Lead and Purchasing Support excluded');
assert(mpocs[lompocKey][0].email === 'uribecolima.adriana@lusd.org', 'Lompoc top contact = Decision Maker and Project Lead (highest priority)');

console.log('\n--- Join + cohort defaulting ---');
const joined = joinDistricts(districts, COHORT_FIXTURE, mpocs);
const adelantoJoined = joined.find((d) => d.name.includes('Adelanto'))!;
const beaumontJoined = joined.find((d) => d.name.includes('Beaumont'))!;
assert(adelantoJoined.tierNum === 1, 'Adelanto joined as Tier 1');
assert(adelantoJoined.csmSlug === 'daisy', 'Adelanto CSM slug = daisy (from BTS Account Owner; cohort CSM is training lead, not relationship owner)');
assert(adelantoJoined.enrollment === 7440, 'Adelanto enrollment carried from cohort');
assert(Math.abs((adelantoJoined.ytdPacing ?? 0) - 0.56) < 0.001, 'Adelanto YTD pacing carried from cohort');
assert(adelantoJoined.mpocs.length === 2, 'Adelanto MPOCs joined');
assert(beaumontJoined.tierNum === 2, 'Beaumont defaults to Tier 2 (not in cohort fixture)');
assert(beaumontJoined.enrollment === null, 'Beaumont has null enrollment (no cohort match)');

const cached = loadCachedRawIfPresent();
if (cached) {
  console.log('\n--- Real BTS cache (.cache/bts-tracker.txt) ---');
  const realDistricts = parseBTSTracker(cached);
  console.log(`  parsed ${realDistricts.length} districts`);
  console.log('  first 3 districts:', realDistricts.slice(0, 3).map((d) => d.name));
  console.log('  last 3 districts:', realDistricts.slice(-3).map((d) => d.name));
}

console.log('\n✓ all parser tests passed');

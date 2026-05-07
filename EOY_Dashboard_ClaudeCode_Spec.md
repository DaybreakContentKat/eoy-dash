# EOY Dashboard — Claude Code Build Spec
**Daybreak Health · BTS 2026 EOY Call Management**
*Paste this entire file into Claude Code to kick off the build.*

---

## What You're Building

A standalone web dashboard that refreshes daily at 8am EST and gives each Daybreak CSM a prioritized view of their EOY district calls — what's overdue, what to book, what's booked, what needs a nudge, and who's a upsell candidate. The home page shows portfolio-level progress with a gap-to-goal tracker. Each CSM page generates batch Claude prompts (copy to clipboard + open Claude project) for email drafts, prep decks, and data reports — all executable in one shot in the Claude project, no copy-paste per district.

No login. No database. Google Sheets is the source of truth. MPOC contacts are a baked-in CSV.

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Hosting:** Netlify
- **Data refresh:** Netlify Scheduled Function (cron) — runs daily at 8am EST
- **Data source:** Google Sheets via Drive MCP OAuth (no service account needed)
- **State:** Static JSON snapshot written to `/public/data/snapshot.json` on each refresh
- **No database, no auth, no SSR** — all pages are client-rendered from the snapshot

---

## Data Sources

### 1. BTS Tracker (primary)
- **Drive file ID:** `16gycwzxACC2--gNuWpGeN0kcjtXUGv1d`
- **Sheet:** `📋 District Tracker`
- **Access method:** `Google Drive read_file_content` via Drive MCP
- **Refresh:** Daily cron writes output to `snapshot.json`

**Column map (0-indexed, after header row):**
| Col | Field | Notes |
|-----|-------|-------|
| 0 | District Name | |
| 1 | Account Owner | Filter key per CSM |
| 2 | Active Renewal (Y/N) | |
| 3 | MPOC Name | Display only — use contacts CSV for email |
| 4 | Last Day of School | Parse as date |
| 5 | EOY Call Target Date | Ignore — derive as LDoS minus 28 days |
| 6 | EOY Meeting Booked (Y/N) | |
| 7 | EOY Meeting Date | |
| 8 | EOY Outreach Sent (Y/N) | |
| 9 | EOY Meeting Completed (Y/N) | |
| 14 | Last Outreach Sent Date (for nudges) | New column — parse as date |
| 15 | Notes / Flags | |
| 16 | Overall Status | |

**Also parse the `BTS Tiers - Reference for Claud` section in the same file:**
| Col | Field |
|-----|-------|
| 0 | District Name |
| 2 | CSM |
| 6 | Training Tier (Tier 1 / Tier 2 / Tier 3) |

Tier meanings:
- **Tier 1:** Moderate + Unlimited OR new district (Apr 2026+) → live EOY call required
- **Tier 2:** Moderate + No Cost (existing) → live EOY call expected
- **Tier 3:** Lower touch → async Google Form outreach only

Default to Tier 2 if district not found in tiers section.

---

### 2. District Data Sheet (Looker — for decks, reports, upsell flags)
- **Drive file ID:** `1C0CqG1jTAp40_3Tr2zCOlGU7bC_8f7ogYeRoqmeqE0A`
- **Sheet name:** check on first load — likely `District Data 25-26 SY`
- **Access method:** `Google Drive read_file_content`
- **Key fields to extract per district:**
  - District name (join key — fuzzy match against BTS tracker names)
  - Total enrolled students
  - Total referrals
  - Completed sessions
  - Uninsured students count
  - Uninsured students as % of enrolled
  - Top presenting concerns (top 3-5 categories by volume)
  - Avg sessions per student
  - Any pacing or utilization rate field

**On first run:** read the sheet, log all column headers to console so you can confirm field names before wiring up the parser. Add a `// TODO: confirm column names` comment block with the logged headers.

---

### 3. MPOC Contacts (baked in)
- **Source:** `/public/data/mpocs.csv` — copy from project file `Project_leads_contacts_4_20.csv`
- **Columns used:** `Account Name`, `Partnership Role`, `First Name`, `Last Name`, `Email`
- **Role priority for selecting contacts:**
  1. Decision Maker and Project Lead → priority 0
  2. Decision Maker → priority 1
  3. Project Lead → priority 2
  4. Communications Lead → priority 3 (only if no higher-priority contact exists)
  5. Exclude: Purchasing Support
- **Output:** `{ district_name_lowercase: [{ name, email }] }` — max 2 contacts per district

---

## Data Refresh — Cron Function

**File:** `netlify/functions/refresh-data.mts`
**Schedule:** `0 13 * * *` (8am EST = 1pm UTC)

Logic:
1. Call Drive MCP to read BTS tracker → parse districts + tiers
2. Call Drive MCP to read District Data sheet → parse utilization + uninsured fields
3. Join on district name (lowercase, strip suffix, fuzzy match)
4. Compute derived fields (see Triage Logic below)
5. Write merged output to `/public/data/snapshot.json`
6. Log timestamp + district count

**Fallback:** if Drive MCP call fails, keep the last snapshot and set `snapshot.stale = true`. Surface a warning banner on the dashboard.

---

## Triage Logic (computed at refresh time)

```typescript
const today = new Date();

function bookingTarget(lastDayOfSchool: Date): Date {
  return subDays(lastDayOfSchool, 28);
}

function isOverdue(d: District): boolean {
  return (
    !d.booked &&
    !d.completed &&
    d.bookingTarget != null &&
    today > d.bookingTarget
  );
}

function needsNudge(d: District): boolean {
  return (
    d.outreachSent &&
    !d.booked &&
    !d.completed &&
    d.lastOutreachSentDate != null &&
    differenceInDays(today, d.lastOutreachSentDate) >= 3
  );
}

function isUpsellCandidate(d: District): boolean {
  // Flag if uninsured student count is in top quartile across all districts
  // OR uninsured % of enrolled > 15%
  // These thresholds are CONFIG constants — adjust as needed
  return (
    d.uninsuredCount > UPSELL_UNINSURED_COUNT_THRESHOLD || // default: 50
    d.uninsuredPct > UPSELL_UNINSURED_PCT_THRESHOLD        // default: 0.15
  );
}

type CardStatus = 'overdue' | 'schedule-soon' | 'nudge' | 'booked' | 't3-async' | 'completed';

function getStatus(d: District): CardStatus {
  if (d.completed) return 'completed';
  if (d.tierNum === 3) return 't3-async';
  if (isOverdue(d)) return 'overdue';
  if (d.booked) return 'booked';
  if (needsNudge(d)) return 'nudge';
  return 'schedule-soon';
}
```

---

## Gap-to-Goal Logic

Computed at refresh time, stored in snapshot per CSM and portfolio-wide.

```typescript
function gapToGoal(districts: District[]): GapToGoal {
  const needsCalls = districts.filter(d => !d.completed && d.tierNum <= 2);
  const unbooked = needsCalls.filter(d => !d.booked);

  // Group unbooked by weeks remaining until their booking window closes
  const byUrgency = unbooked.reduce((acc, d) => {
    if (!d.bookingTarget) { acc.noDate.push(d); return acc; }
    const weeksLeft = Math.max(0, differenceInWeeks(d.bookingTarget, today));
    if (weeksLeft === 0) acc.thisWeek.push(d);
    else if (weeksLeft === 1) acc.nextWeek.push(d);
    else if (weeksLeft <= 3) acc.soon.push(d);
    else acc.later.push(d);
    return acc;
  }, { thisWeek: [], nextWeek: [], soon: [], later: [], noDate: [] });

  // Weighted weekly target: spread remaining calls across remaining weeks
  // Weight toward urgency: districts closing sooner count more
  const totalWeeksAvailable = needsCalls.reduce((sum, d) => {
    if (!d.bookingTarget) return sum + 4; // assume 4 weeks if no date
    return sum + Math.max(1, differenceInWeeks(d.bookingTarget, today));
  }, 0);

  const weeklyTarget = Math.ceil(unbooked.length / Math.max(1, totalWeeksAvailable / unbooked.length));

  return {
    totalNeedingCall: needsCalls.length,
    booked: needsCalls.filter(d => d.booked).length,
    completed: districts.filter(d => d.completed).length,
    unbooked: unbooked.length,
    weeklyTarget,           // "you need to book X per week"
    thisWeekUrgent: byUrgency.thisWeek.length,
    atRisk: unbooked.filter(d => d.bookingTarget && differenceInDays(d.bookingTarget, today) < 7).length,
    byUrgency,
  };
}
```

Display on home page: **"Book [X] per week to hit 100% before school ends"**
Display per CSM page: same, scoped to their portfolio.

---

## Pages

### `/` — Portfolio Overview

**Header:**
- Title: "EOY Dashboard — BTS 2026"
- Last refreshed timestamp + staleness warning if applicable

**Stats bar (cumulative, T1+T2 only):**
- Total districts needing live calls | Completed | Booked | Outreach Sent | Overdue | Nudge-ready

**Gap-to-Goal banner:**
- "X districts unbooked. Book [Y] per week across the team to hit 100% before school ends."
- Color: yellow if on track, red if behind (behind = this week's urgent count > weekly target)

**Tier breakdown table:**
```
         | Total | Completed | Booked | Remaining | Overdue
Tier 1   |   16  |     2     |    8   |     6     |   4
Tier 2   |   38  |     8     |   18   |    12     |   6
Tier 3   |   14  |     —     |    —   |    14     |   —  (async only)
```

**Progress bars per tier** (% booked of total T1/T2)

**CSM cards** — one per owner, showing:
- Name, booked/total, overdue count, gap-to-goal weekly target
- Link to `/[csm]`

---

### `/[csm]` — CSM Dashboard

**CSM options:** `brianna` | `sarah` | `monica` | `daisy`

**Header:**
- CSM name + gap-to-goal: "Book [X] this week to stay on pace"
- Quick stats: Total | Booked | Overdue | Nudge-ready | Upsell candidates

**Batch action bar (top of page):**
Three buttons that generate and copy batch prompts + open the Claude project:

1. **📧 Draft this week's booking emails** — generates one prompt covering ALL districts in the `schedule-soon` + `overdue` + `nudge` categories with MPOC contacts included. Claude executes all Gmail drafts in one run.

2. **📅 Build this week's prep packs** — generates one prompt covering ALL districts with meetings booked. Claude pulls data from the District Data sheet and builds deck + report for each in sequence.

3. **🔔 Draft this week's nudges** — generates one prompt covering ALL districts flagged for nudge. Claude generates warm follow-up emails for each in one run.

**Prompt format for all three (paste into Claude project):**
```
[ACTION: BATCH_BOOKING_EMAILS]
CSM: Brianna Masciel
Calendly: https://calendly.com/brianna-daybreakhealth/30min
Project: https://claude.ai/project/019dacd2-8a9b-7376-93a1-678a1a462b3b

Districts:
1. Lompoc Unified School District
   MPOC: Adriana Uribe Colima <uribecolima.adriana@lusd.org>
   LDoS: 6/4/2026 | Status: Overdue (booking window closed 5/7)

2. Beaumont Unified School District
   MPOC: [name] <email>
   LDoS: 6/4/2026 | Status: Schedule soon (book by 5/7)

[... all applicable districts ...]

---
For each district above, create a Gmail draft to the listed MPOC(s).
Subject: Let's schedule our EOY check-in — [District Short Name]
Tone: warm, brief, CSM is Brianna. Include Calendly link.
Execute all drafts now via Gmail MCP. Do not ask for confirmation between drafts.
```

**District cards (same triage sections as current widget):**

Sections in order:
1. 🔴 Overdue — book now
2. 🔔 Needs nudge (outreach sent 3+ days ago, no booking)
3. 📆 Schedule soon
4. ✅ Booked — prep needed
5. 📋 T3 / Async (collapsed)
6. ✓ Completed (collapsed)

**Each card shows:**
- Tier badge (T1/T2/T3 styled)
- District short name
- LDoS date
- Meeting date (if booked)
- 💡 Upsell candidate tag (if flagged) — hover shows: "X uninsured students (Y%)"
- **Individual action buttons** (in addition to batch buttons above):
  - Book → Draft (for overdue/schedule-soon)
  - Nudge → Draft (for nudge-flagged)
  - Copy prep prompt (for booked)
  - Send Form → (T3, links to async Google Form)

**Individual prompt format (copy + open Claude project):**
Same structure as batch but scoped to one district. Includes upsell talking point if flagged:
```
[ACTION: PREP_PACK]
District: Lompoc Unified School District
CSM: Brianna | Meeting: 5/28/2026
District Data Sheet ID: 1C0CqG1jTAp40_3Tr2zCOlGU7bC_8f7ogYeRoqmeqE0A
MPOC: Adriana Uribe Colima <uribecolima.adriana@lusd.org>
Project: https://claude.ai/project/019dacd2-8a9b-7376-93a1-678a1a462b3b
Upsell flag: YES — 87 uninsured students (18% of enrolled). Include district sponsorship talking point.

---
Build the EOY deck and data report for this district.
Pull utilization and presenting concerns data from the District Data sheet.
Include upsell talking point in the deck notes if flagged above.
Use the daybreak-eoy-deck skill in this project.
```

---

## Upsell Candidate Logic (detail)

**Config constants (in `/lib/config.ts`):**
```typescript
export const UPSELL_UNINSURED_COUNT_THRESHOLD = 50;  // raw student count
export const UPSELL_UNINSURED_PCT_THRESHOLD = 0.15;  // 15% of enrolled
```

**Card behavior:**
- `💡 Upsell` tag appears on card next to tier badge
- Tag color: amber — `bg-amber-50 text-amber-700 border border-amber-200`
- Hover tooltip: "87 uninsured students · 18% of enrolled · District sponsorship opportunity"
- Prep prompt for this district automatically includes the upsell section
- Home page and CSM header shows count: "X upsell candidates in your portfolio"

**Talking point injected into prep prompt:**
> "This district has [X] students without insurance coverage ([Y]% of enrolled). District sponsorship could extend access to these students at no cost to families. Recommend raising this in the EOY call — position as expanding impact of their existing investment."

---

## Nudge Email Prompt Template

Generated when CSM clicks "Nudge → Draft" or included in batch nudge prompt:

```
Subject: Quick follow-up — your students' year-end data is ready

Hi [First Name],

I wanted to follow up on my earlier note. We've got your year-end data ready to share — 
including a breakdown of what your students have been navigating this year and how care 
has been making a difference.

Would love to find 20-30 minutes to walk you through it together. You can grab a time 
here that works for you: [Calendly URL]

Looking forward to connecting soon,
[CSM First Name]
```

Nudge prompt to Claude includes:
- District name
- MPOC name + email
- Days since last outreach
- Calendly URL
- Instruction: create Gmail draft now via Gmail MCP

---

## File Structure

```
/
├── app/
│   ├── page.tsx                    # Portfolio overview (/)
│   ├── [csm]/
│   │   └── page.tsx               # CSM dashboard (/brianna, /sarah, etc.)
│   └── layout.tsx
├── components/
│   ├── StatsBar.tsx
│   ├── TierBreakdownTable.tsx
│   ├── GapToGoalBanner.tsx
│   ├── CSMCard.tsx                # Home page CSM summary cards
│   ├── DistrictCard.tsx           # Individual district card (all states)
│   ├── BatchActionBar.tsx         # Three batch prompt buttons per CSM page
│   ├── TierBadge.tsx
│   ├── UpsellTag.tsx
│   └── SectionHeader.tsx          # Collapsible section headers
├── lib/
│   ├── config.ts                  # Thresholds, CSM names, Calendly URLs, project URL
│   ├── triage.ts                  # Triage logic, gap-to-goal, nudge detection
│   ├── prompts.ts                 # All prompt templates (batch + individual)
│   ├── parsers/
│   │   ├── btsTracker.ts          # Parse BTS tracker text → District[]
│   │   ├── districtData.ts        # Parse District Data sheet → UtilizationData[]
│   │   └── mpocs.ts               # Parse MPOC CSV → MPOCMap
│   └── types.ts                   # TypeScript interfaces
├── public/
│   └── data/
│       ├── snapshot.json          # Written by cron, read by pages
│       └── mpocs.csv              # Static MPOC contacts
├── netlify/
│   └── functions/
│       └── refresh-data.mts       # Scheduled cron — runs daily 8am EST
└── netlify.toml
```

---

## Config (`/lib/config.ts`)

```typescript
export const PROJECT_URL = 'https://claude.ai/project/019dacd2-8a9b-7376-93a1-678a1a462b3b';

export const BTS_TRACKER_FILE_ID = '16gycwzxACC2--gNuWpGeN0kcjtXUGv1d';
export const DISTRICT_DATA_FILE_ID = '1C0CqG1jTAp40_3Tr2zCOlGU7bC_8f7ogYeRoqmeqE0A';

export const ASYNC_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSckbtqio2hvbN5DmwiDamIkdNOrmS89XV0oLuqkiKrbyHiVtA/viewform?usp=header';

export const NUDGE_THRESHOLD_DAYS = 3;
export const UPSELL_UNINSURED_COUNT_THRESHOLD = 50;
export const UPSELL_UNINSURED_PCT_THRESHOLD = 0.15;

export const CSM_CONFIG: Record<string, CSMConfig> = {
  brianna: {
    fullName: 'Brianna Masciel',
    firstName: 'Brianna',
    calendly: 'https://calendly.com/brianna-daybreakhealth/30min',
    slug: 'brianna',
  },
  sarah: {
    fullName: 'Sarah Hough',
    firstName: 'Sarah',
    calendly: 'https://calendly.com/sarah-daybreakhealth/30min',
    slug: 'sarah',
  },
  monica: {
    fullName: 'Monica Knott',
    firstName: 'Monica',
    calendly: 'https://calendly.com/monica-daybreakhealth/30min',
    slug: 'monica',
  },
  daisy: {
    fullName: 'Daisy Leahy',
    firstName: 'Daisy',
    calendly: 'https://calendly.com/daisy-daybreakhealth/30min',
    slug: 'daisy',
  },
};
```

---

## TypeScript Interfaces (`/lib/types.ts`)

```typescript
export interface District {
  name: string;
  shortName: string;
  owner: string;           // matches CSM_CONFIG key
  csm: string;             // from tiers section
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  tierNum: 1 | 2 | 3;
  activeRenewal: boolean;
  lastDayOfSchool: string | null;   // ISO date string
  bookingTarget: string | null;     // LDoS - 28 days
  booked: boolean;
  meetingDate: string | null;
  outreachSent: boolean;
  lastOutreachSentDate: string | null;
  completed: boolean;
  notes: string;
  status: CardStatus;
  overdue: boolean;
  needsNudge: boolean;
  daysSinceOutreach: number | null;
  // From District Data sheet
  utilization: UtilizationData | null;
  isUpsellCandidate: boolean;
}

export interface UtilizationData {
  totalEnrolled: number;
  totalReferrals: number;
  completedSessions: number;
  uninsuredCount: number;
  uninsuredPct: number;
  topConcerns: string[];
  avgSessionsPerStudent: number;
}

export interface MPOCContact {
  name: string;
  email: string;
}

export interface GapToGoal {
  totalNeedingCall: number;
  booked: number;
  completed: number;
  unbooked: number;
  weeklyTarget: number;
  thisWeekUrgent: number;
  atRisk: number;
}

export type CardStatus = 'overdue' | 'nudge' | 'schedule-soon' | 'booked' | 't3-async' | 'completed';
```

---

## Snapshot Schema (`/public/data/snapshot.json`)

```json
{
  "refreshedAt": "2026-05-06T13:00:00Z",
  "stale": false,
  "portfolio": {
    "gapToGoal": { ... },
    "statsByTier": { ... }
  },
  "csms": {
    "brianna": {
      "districts": [ ... ],
      "gapToGoal": { ... },
      "stats": { ... }
    },
    "sarah": { ... },
    "monica": { ... },
    "daisy": { ... }
  }
}
```

---

## Drive MCP Access (cron function)

The cron function calls the Drive MCP endpoint directly using the same OAuth token as the connected Google Drive MCP in Claude.ai. Use `read_file_content` — do NOT use `download_file_content` (too slow, requires base64 decode).

```typescript
async function readDriveFile(fileId: string): Promise<string> {
  const res = await fetch(`https://drivemcp.googleapis.com/mcp/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DRIVE_MCP_TOKEN}`,
    },
    body: JSON.stringify({
      method: 'tools/call',
      params: {
        name: 'read_file_content',
        arguments: { fileId }
      }
    })
  });
  const data = await res.json();
  return data.result?.content?.[0]?.text ?? '';
}
```

**Note:** The OAuth token from Google Drive MCP is user-scoped. For the Netlify cron to work, you'll need to set `DRIVE_MCP_TOKEN` as a Netlify environment variable. To get this token, Claude Code should prompt you to authenticate once via Google OAuth and store the refresh token. Alternatively, Claude Code can explore using the Google Sheets API with a service account if MCP token refresh is too complex — flag this as a decision point during build.

---

## Netlify Config (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[scheduled-functions]]
  name = "refresh-data"
  schedule = "0 13 * * *"
```

---

## Build Order for Claude Code

Build in this sequence — each step is independently testable:

1. **Scaffold** — Next.js + Tailwind + Netlify setup, empty pages, `netlify.toml`
2. **Types + Config** — `types.ts`, `config.ts`, all constants
3. **Parsers** — `btsTracker.ts`, `mpocs.ts` (these can run against static text for testing)
4. **District Data parser** — `districtData.ts` (read the sheet headers first, log them, confirm field names before writing the parser)
5. **Triage logic** — `triage.ts` with unit tests against mock data
6. **Cron function** — `refresh-data.mts`, test with a manual trigger
7. **Snapshot output** — verify `snapshot.json` is correct before touching UI
8. **Home page** — portfolio stats, tier table, gap-to-goal banner, CSM cards
9. **CSM page** — district cards, triage sections, tier badges, upsell tags
10. **Prompt templates** — `prompts.ts`, all batch + individual prompt builders
11. **Batch action bar** — copy + open Claude project behavior
12. **Polish** — staleness warning, mobile layout, empty states

---

## Important Parser Notes

The BTS tracker is returned from `read_file_content` as a **single long string** with all sheet content concatenated. It is not clean CSV. Key parsing rules:

- Find the main tracker section by searching for the string `"District Name,Account Owner"` followed by `"Last Day of School"` — the header row
- Section ends when you hit `"Monicas Sheet"` or `"Daisys Sheet"` 
- Find the tiers section by searching for `"BTS Tiers - Reference for Claud"` then the sub-header `"District,Account Owner,CSM,Market"`
- Use `csv.parse` with `relaxed_quotes: true` — data contains embedded quotes and commas in notes fields
- `#VALUE!` in date fields = treat as null
- Year > 2026 in LDoS = data entry error, treat as null
- `booking_target` = `lastDayOfSchool - 28 days`
- CSM filter: use the tiers section `CSM` column (col 2), not Account Owner — many districts are owned by Daisy/Monica but have Brianna as CSM

---

## Notes for Claude Code

- Keep all config values in `/lib/config.ts` — never hardcode in components
- Every prompt template lives in `/lib/prompts.ts` — components import and call, never construct prompts inline
- The "copy + open" pattern: `navigator.clipboard.writeText(prompt)` then `window.open(PROJECT_URL, '_blank')` — these fire together on button click
- Batch prompts include ALL districts in scope as a numbered list — Claude reads the action tag and executes all in one pass without asking for confirmation between items
- Test the cron function locally with `netlify dev` before deploying
- On the District Data sheet: the first run should log all column headers so field names can be confirmed. Add a `COLUMN_MAP` constant in `districtData.ts` that maps confirmed header strings to typed fields — this makes it easy to update if the sheet schema changes

import type { CSMConfig } from './types';

export const PROJECT_URL =
  'https://claude.ai/project/019dacd2-8a9b-7376-93a1-678a1a462b3b';

export const BTS_TRACKER_FILE_ID = '16gycwzxACC2--gNuWpGeN0kcjtXUGv1d';
export const DISTRICT_DATA_FILE_ID = '1C0CqG1jTAp40_3Tr2zCOlGU7bC_8f7ogYeRoqmeqE0A';
// BTS_2026_Training_Cohorts — source of truth for cohort/tier assignment, CSM
// ownership, enrollment, and YTD pacing. Replaces the old tiers section that
// used to live inside the BTS tracker.
export const COHORT_FILE_ID = '1DN6Cxc8gcM5GHLq4-3FnLV-kCRAqVHEW6QDGxLBgVfE';

// Fall Planning Quick Check-In — embedded in async email prompts. Source of
// truth for which form to send is the Notion guide below.
export const ASYNC_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScjV4W70VMPWLhVAo5QQiB66Ihh_TAwwVi-xSnxYrCvOJU0-Q/viewform?usp=sharing&ouid=104846538771365128927';

export const PARTNERSHIP_EMAIL = 'partnership@daybreakhealth.com';

export const NOTION_ASYNC_GUIDE_URL =
  'https://www.notion.so/daybreakhealth/Async-EOY-Check-In-Email-Templates-Guide-35d10de5425e810382dce5602a180f67';

// CSMs log their bookings/meetings/outreach back into this tracker so the
// dashboard, the source data, and the team's day-to-day workflow stay
// aligned. Linked from each CSM page.
export const BTS_TRACKER_URL =
  'https://docs.google.com/spreadsheets/d/16gycwzxACC2--gNuWpGeN0kcjtXUGv1d/edit?gid=175562126#gid=175562126';

export const BOOKING_WINDOW_DAYS_BEFORE_LDOS = 28;
// Primary upsell signal is the COMBINED gap (uninsured + OON), not uninsured
// alone. Threshold = 10 patients; flag is sourced from
// scripts/static-upsell.json (baked once from Looker on 2026-05-12 — not
// refreshed). All Unlimited (including CYBHI Unlimited) is excluded since
// those contracts already cover these students.
export const UPSELL_GAP_COUNT_THRESHOLD = 10;
export const UPSELL_ELIGIBLE_CONTRACTS = [
  'No Cost',
  'No Cost + CYBHI',
  'Blended',
] as const;

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

export const CSM_SLUGS = Object.keys(CSM_CONFIG);

const CSM_FULLNAME_TO_SLUG = Object.fromEntries(
  Object.entries(CSM_CONFIG).map(([slug, c]) => [c.fullName.toLowerCase(), slug]),
);

const CSM_FIRSTNAME_TO_SLUG = Object.fromEntries(
  Object.entries(CSM_CONFIG).map(([slug, c]) => [c.firstName.toLowerCase(), slug]),
);

export function csmSlugFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return null;
  if (CSM_FULLNAME_TO_SLUG[trimmed]) return CSM_FULLNAME_TO_SLUG[trimmed];
  const first = trimmed.split(/\s+/)[0];
  return CSM_FIRSTNAME_TO_SLUG[first] ?? null;
}

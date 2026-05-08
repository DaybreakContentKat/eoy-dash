import { DISTRICT_DATA_FILE_ID, PROJECT_URL } from './config';
import type { CSMConfig, District } from './types';

/**
 * Prompt builders for the Claude project. Each one returns a single prompt
 * string that's copied to clipboard when the user clicks an action button on
 * the dashboard. The user is then redirected to the project, pastes the
 * prompt, and Claude executes the bundled actions in one pass.
 *
 * Conventions: every prompt starts with `[ACTION: <NAME>]` so the project's
 * skills can route on it, lists all in-scope districts up front, and ends
 * with an explicit instruction telling Claude to execute without
 * confirmation between items.
 */

export function buildBatchBookingPrompt(csm: CSMConfig, districts: District[]): string {
  const items = districts.map((d, i) => formatBookingItem(d, i + 1)).join('\n\n');
  return [
    '[ACTION: BATCH_BOOKING_EMAILS]',
    `CSM: ${csm.fullName}`,
    `Calendly: ${csm.calendly}`,
    `Project: ${PROJECT_URL}`,
    '',
    `Districts (${districts.length}):`,
    items,
    '',
    '---',
    'For each district above, create a Gmail draft to the listed MPOC(s).',
    `Subject: Let's schedule our EOY check-in — [District Short Name]`,
    `Tone: warm, brief, CSM is ${csm.firstName}. Include the Calendly link.`,
    'Execute all drafts now via the Gmail MCP. Do not ask for confirmation between drafts.',
    'If a district has no MPOC contact listed, skip it and report which were skipped.',
  ].join('\n');
}

export function buildIndividualBookingPrompt(csm: CSMConfig, d: District): string {
  return [
    '[ACTION: BOOKING_EMAIL]',
    `CSM: ${csm.fullName}`,
    `Calendly: ${csm.calendly}`,
    `Project: ${PROJECT_URL}`,
    '',
    formatBookingItem(d, 1),
    '',
    '---',
    `Create a Gmail draft to the MPOC(s) listed above. Subject: Let's schedule our EOY check-in — ${d.shortName || d.name}.`,
    `Tone: warm, brief, CSM is ${csm.firstName}. Include the Calendly link.`,
    'Execute via the Gmail MCP now.',
  ].join('\n');
}

export function buildIndividualPrepPrompt(csm: CSMConfig, d: District): string {
  const upsellLine = upsellTalkingPoint(d);
  return [
    '[ACTION: PREP_PACK]',
    `District: ${d.name}`,
    `CSM: ${csm.fullName} | Meeting: ${formatDate(d.meetingDate) ?? 'TBD'}`,
    `District Data Sheet ID: ${DISTRICT_DATA_FILE_ID}`,
    `MPOC: ${formatMPOCs(d) || '(no contact on file)'}`,
    `Project: ${PROJECT_URL}`,
    upsellLine ? `Upsell flag: YES — ${upsellLine}` : 'Upsell flag: no',
    '',
    '---',
    'Build the EOY deck and data report for this district.',
    'Pull utilization and presenting-concerns data from the District Data sheet.',
    'Include the upsell talking point in the deck notes if flagged above.',
    'Use the daybreak-eoy-deck skill in this project.',
  ].join('\n');
}

function formatBookingItem(d: District, n: number): string {
  const status = d.overdue
    ? `Overdue (booking window closed ${formatDate(d.bookingTarget) ?? '?'})`
    : `Schedule soon (book by ${formatDate(d.bookingTarget) ?? '?'})`;
  const lines = [
    `${n}. ${d.name}`,
    `   MPOC: ${formatMPOCs(d) || '(no contact on file)'}`,
    `   LDoS: ${formatDate(d.lastDayOfSchool) ?? 'unknown'} | Status: ${status}`,
  ];
  return lines.join('\n');
}

function upsellTalkingPoint(d: District): string | null {
  if (!d.isUpsellCandidate || !d.utilization) return null;
  const blocked = d.utilization.insuranceBlockedStudents;
  const inNet = d.utilization.inNetworkStudents;
  const pct = (d.utilization.insuranceBlockedPct * 100).toFixed(1);
  return `${blocked} of ${blocked + inNet} students blocked by insurance reasons (${pct}%). District sponsorship could extend access to these students. Recommend raising as expansion of existing investment.`;
}

function formatMPOCs(d: District): string {
  return d.mpocs.map((m) => `${m.name} <${m.email}>`).join('; ');
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${y}`;
}

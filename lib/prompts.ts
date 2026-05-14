import {
  ASYNC_FORM_URL,
  DISTRICT_DATA_FILE_ID,
  NOTION_ASYNC_GUIDE_URL,
  PARTNERSHIP_EMAIL,
  PROJECT_URL,
  SELF_CONSENT_STATES,
} from './config';
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
    'For EVERY district above, create a Gmail draft — do not skip any.',
    `Subject (when MPOC present): Let's schedule our EOY check-in — [District Short Name]`,
    'If a district has no MPOC on file, still create the draft, but leave the To: field empty and prefix the subject with "[ADD MPOC] " so the rep sees it before sending.',
    `Tone: warm, brief, CSM is ${csm.firstName}. Include the Calendly link.`,
    'Execute all drafts now via the Gmail MCP. Do not ask for confirmation between drafts.',
    'At the end, report a count of how many drafts were created and how many were flagged "[ADD MPOC]".',
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
    `Create a Gmail draft for this district — always create it, never skip.`,
    `If MPOC is listed above, address the draft to them. Subject: Let's schedule our EOY check-in — ${d.shortName || d.name}.`,
    `If MPOC is "(no contact on file)", still create the draft: leave the To: field empty and prefix the subject with "[ADD MPOC] " so the rep sees it before sending.`,
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

export function buildIndividualAsyncEmailPrompt(csm: CSMConfig, d: District): string {
  const mpoc = formatMPOCs(d);
  const mpocLine = mpoc
    ? `MPOC: ${mpoc}`
    : 'MPOC: (no contact on file — ask user for the MPOC name and email before drafting)';
  return [
    '[ACTION: ASYNC_EMAIL]',
    `CSM: ${csm.fullName} (sending from their own inbox)`,
    `Project: ${PROJECT_URL}`,
    `Notion guide: ${NOTION_ASYNC_GUIDE_URL}`,
    '',
    `District: ${d.name}`,
    mpocLine,
    `LDoS: ${formatDate(d.lastDayOfSchool) ?? 'unknown'}`,
    '',
    '---',
    `Draft a Gmail to the MPOC above using Template 1 (CSM/AM personal voice) from the Notion guide.`,
    `Subject (use verbatim): Quick check-in before the year wraps up`,
    `Signed by ${csm.firstName}. Use "I" language. Offer a quick call as a fallback.`,
    `Insert this form link where the template says [INSERT FORM LINK]: ${ASYNC_FORM_URL}`,
    `If no MPOC was provided above, ask the user for the contact before creating the draft — do not invent an address.`,
    'Execute via the Gmail MCP now.',
  ].join('\n');
}

export function buildBatchAsyncEmailPrompt(csm: CSMConfig, districts: District[]): string {
  const items = districts.map((d, i) => formatAsyncItem(d, i + 1)).join('\n\n');
  return [
    '[ACTION: BATCH_ASYNC_EMAILS]',
    `Sender: ${PARTNERSHIP_EMAIL} (team voice)`,
    `Account owner reference: ${csm.fullName}`,
    `Project: ${PROJECT_URL}`,
    `Notion guide: ${NOTION_ASYNC_GUIDE_URL}`,
    '',
    `Districts (${districts.length}):`,
    items,
    '',
    '---',
    `For each district above, create a Gmail draft from ${PARTNERSHIP_EMAIL} to the listed MPOC using Template 2 (partnership/team voice) from the Notion guide.`,
    `Subject (use verbatim): 5 minutes to set your district up for a great fall`,
    `Use "we" language. Replies should route to their Daybreak contact — do not personalize per CSM.`,
    `Insert this form link where the template says [INSERT FORM LINK]: ${ASYNC_FORM_URL}`,
    'Execute all drafts now via the Gmail MCP. Do not ask for confirmation between drafts.',
    'If a district has no MPOC contact listed, skip it and report which were skipped.',
  ].join('\n');
}

function formatAsyncItem(d: District, n: number): string {
  return [
    `${n}. ${d.name}`,
    `   MPOC: ${formatMPOCs(d) || '(no contact on file — skip and flag)'}`,
    `   LDoS: ${formatDate(d.lastDayOfSchool) ?? 'unknown'}`,
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
  if (!d.isUpsellCandidate || !d.upsellData) return null;
  const u = d.upsellData;
  const scLaw = SELF_CONSENT_STATES[u.state];

  // Three mutually-exclusive context lines around the self-consent angle:
  //  - district has both self-consent law AND minor-self-consent intake data → strongest pitch
  //  - district has self-consent intake data but state isn't in our enumerated map → softer note
  //  - district has self-consent law but no intake data this season → permanence note
  let contextLine = '';
  if (u.minorSelfAddendum && scLaw) {
    contextLine =
      `Additionally, ${u.minorSelfAddendum} students (${(u.minorSelfAddendumPct ?? 0).toFixed(1)}% of referrals) came in via minor self-consent — ` +
      `a legal pathway in ${u.state} (${scLaw.note}). These students cannot always provide insurance information. ` +
      `This is a structural, recurring gap — not a one-off. District sponsorship through Unlimited would cover them regardless of insurance status. `;
  } else if (u.minorSelfAddendum) {
    contextLine = `Additionally, ${u.minorSelfAddendum} students self-consented without a parent and could not provide insurance. `;
  } else if (scLaw) {
    contextLine =
      `Note: ${u.state} allows minor self-consent (${scLaw.note}). Students may continue to access care without parental insurance information — Unlimited would cover this gap permanently. `;
  }

  return (
    `${u.gap} patients lack full coverage (${u.combinedPct.toFixed(1)}% of caseload). ` +
    `Breakdown: ${u.uninsured} uninsured, ${u.oon} out-of-network. ` +
    `Current contract: ${u.contract}. ` +
    contextLine +
    `Upgrading to Unlimited would cover these students at no cost to families. Include in EOY talking points.`
  );
}

function formatMPOCs(d: District): string {
  return d.mpocs.map((m) => `${m.name} <${m.email}>`).join('; ');
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${y}`;
}

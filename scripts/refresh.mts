/**
 * Reads the cached raw text dumps from .cache/, runs all parsers + triage,
 * and writes public/data/snapshot.json. Invoked locally for development and
 * by the scheduled Claude agent in production after it fetches both Sheets
 * via the Drive MCP.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CSM_SLUGS } from '../lib/config.ts';
import { joinDistricts, parseBTSTracker } from '../lib/parsers/btsTracker.ts';
import { parseCohorts } from '../lib/parsers/cohorts.ts';
import { aggregateUtilization, parseDistrictData } from '../lib/parsers/districtData.ts';
import { parseMPOCs } from '../lib/parsers/mpocs.ts';
import { annotateDistrict, bookingTargetFor, gapToGoal, portfolioStats } from '../lib/triage.ts';
import type { CSMSnapshot, District, Snapshot } from '../lib/types.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_BTS = resolve(ROOT, '.cache/bts-tracker.txt');
const CACHE_DISTRICT = resolve(ROOT, '.cache/district-data.txt');
const CACHE_COHORTS = resolve(ROOT, '.cache/cohorts.txt');
const MPOCS_CSV = resolve(ROOT, 'public/data/mpocs.csv');
const SNAPSHOT_OUT = resolve(ROOT, 'public/data/snapshot.json');

function readOrDie(path: string, label: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch (e) {
    console.error(`✗ Could not read ${label} at ${path}`);
    console.error(`  ${(e as Error).message}`);
    console.error(`  The scheduled agent should fetch this via Drive MCP and write it here.`);
    process.exit(1);
  }
}

function main(): void {
  const today = new Date();
  console.log(`refresh starting at ${today.toISOString()}`);

  const rawBTS = readOrDie(CACHE_BTS, 'BTS tracker cache');
  const rawDistrict = readOrDie(CACHE_DISTRICT, 'District Data cache');
  const rawCohorts = readOrDie(CACHE_COHORTS, 'Cohorts cache');
  const rawMPOCs = readOrDie(MPOCS_CSV, 'MPOC CSV');

  const btsDistricts = parseBTSTracker(rawBTS);
  const cohorts = parseCohorts(rawCohorts);
  const districtRaw = parseDistrictData(rawDistrict);
  const utilByDistrict = aggregateUtilization(districtRaw);
  const mpocMap = parseMPOCs(rawMPOCs);
  const joined = joinDistricts(btsDistricts, cohorts, mpocMap);

  console.log(
    `parsed: ${btsDistricts.length} districts, ${cohorts.length} cohort records, ` +
      `${districtRaw.insurance.length} insurance rows, ${districtRaw.concerns.length} concern rows, ` +
      `${Object.keys(mpocMap).length} MPOC districts`,
  );

  const districts: District[] = joined.map((d) => {
    const bookingTarget = bookingTargetFor(d.lastDayOfSchool);
    const util = utilByDistrict[normalizedName(d.name)] ?? null;
    return annotateDistrict(
      {
        name: d.name,
        shortName: d.shortName,
        owner: d.owner,
        csm: d.csm,
        tier: d.tier,
        tierNum: d.tierNum,
        activeRenewal: d.activeRenewal,
        lastDayOfSchool: d.lastDayOfSchool,
        bookingTarget,
        booked: d.booked,
        meetingDate: d.meetingDate,
        outreachSent: d.outreachSent,
        completed: d.completed,
        notes: d.notes,
        status: 'schedule-soon',
        overdue: false,
        utilization: util,
        isUpsellCandidate: false,
        mpocs: d.mpocs,
        enrollment: d.enrollment,
        ytdPacing: d.ytdPacing,
        // Carry the CSM slug forward for routing.
        csmSlug: d.csmSlug,
      } as District & { csmSlug: string | null },
      today,
    );
  });

  const csms: Record<string, CSMSnapshot> = {};
  for (const slug of CSM_SLUGS) {
    const owned = districts.filter((d) => (d as District & { csmSlug: string | null }).csmSlug === slug);
    csms[slug] = {
      districts: owned.map(stripInternal),
      gapToGoal: gapToGoal(owned, today),
      stats: portfolioStats(owned),
    };
  }

  const orphans = districts
    .filter((d) => !(d as District & { csmSlug: string | null }).csmSlug)
    .map(stripInternal);

  const snapshot: Snapshot = {
    refreshedAt: today.toISOString(),
    stale: false,
    portfolio: {
      gapToGoal: gapToGoal(districts, today),
      stats: portfolioStats(districts),
    },
    csms,
    orphans,
  };

  mkdirSync(dirname(SNAPSHOT_OUT), { recursive: true });
  writeFileSync(SNAPSHOT_OUT, JSON.stringify(snapshot, null, 2));

  reportSummary(snapshot, districts);
}

function stripInternal(d: District): District {
  // The csmSlug carrier prop isn't in the public District shape; remove before serializing.
  const { csmSlug: _csmSlug, ...rest } = d as District & { csmSlug?: string | null };
  return rest;
}

function normalizedName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function reportSummary(snapshot: Snapshot, all: District[]): void {
  const orphans = all.filter((d) => !(d as District & { csmSlug: string | null }).csmSlug);
  console.log('---');
  console.log(`portfolio T1+T2: ${snapshot.portfolio.stats.totalT1T2}`);
  console.log(`  completed: ${snapshot.portfolio.stats.completed}`);
  console.log(`  booked: ${snapshot.portfolio.stats.booked}`);
  console.log(`  overdue: ${snapshot.portfolio.stats.overdue}`);
  console.log(`  upsellCandidates: ${snapshot.portfolio.stats.upsellCandidates}`);
  console.log(`  weeklyTarget: ${snapshot.portfolio.gapToGoal.weeklyTarget}/wk`);
  for (const slug of CSM_SLUGS) {
    const c = snapshot.csms[slug];
    console.log(
      `  ${slug}: ${c.districts.length} districts, ` +
        `${c.stats.completed} done / ${c.stats.booked} booked / ${c.stats.overdue} overdue, ` +
        `weeklyTarget ${c.gapToGoal.weeklyTarget}/wk`,
    );
  }
  if (orphans.length) {
    console.log(`(${orphans.length} districts with no CSM match — included in portfolio totals only)`);
    for (const o of orphans.slice(0, 10)) console.log(`    - ${o.name} (owner: ${o.owner || '-'}, csm: ${o.csm || '-'})`);
    if (orphans.length > 10) console.log(`    ...and ${orphans.length - 10} more`);
  }
  console.log(`✓ wrote ${SNAPSHOT_OUT}`);
}

main();

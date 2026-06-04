'use client';

import { useState } from 'react';
import { TierBadge } from '@/components/TierBadge';
import { BTS_OWNER_TABS } from '@/lib/bts';
import type {
  BtsData,
  NoFormDistrict,
  OwnerGroups,
  SchedStatus,
  SubmittedDistrict,
  TierCount,
} from '@/lib/bts';
import { SchedulingTable } from './SchedulingTable';

type TierLike = number | string;

function TierTag({ tier }: { tier: TierLike }) {
  if (tier === 1 || tier === 2 || tier === 3) return <TierBadge tierNum={tier} />;
  return (
    <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
      ?
    </span>
  );
}

const TONE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};

function StatusPill({ status, prefix }: { status: SchedStatus; prefix?: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TONE[status.state]}`}>
      {prefix ? `${prefix}: ` : ''}
      {status.label}
    </span>
  );
}

function Shared() {
  return (
    <span className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
      Shared
    </span>
  );
}

function FormOwnerNote({ owner }: { owner: string }) {
  return <span className="text-[11px] text-amber-700">form: {owner}</span>;
}

function formatLdos(iso: string | null): string {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function pctTone(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function Pill({
  label,
  value,
  total,
  countTone,
}: {
  label: string;
  value: number;
  total?: number;
  countTone?: string;
}) {
  const pct = total && total > 0 ? (value / total) * 100 : 0;
  const tone = total !== undefined ? pctTone(pct) : countTone ?? 'text-zinc-900';
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
        {total !== undefined && <span className="text-sm font-normal text-zinc-400"> / {total}</span>}
      </dd>
      {total !== undefined && (
        <div className="mt-0.5 text-[11px] text-zinc-400">{Math.round(pct)}%</div>
      )}
    </div>
  );
}

function Group({
  icon,
  title,
  count,
  open,
  children,
}: {
  icon: string;
  title: string;
  count: number;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group rounded-lg border border-zinc-200 bg-white">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
        <span>{icon}</span>
        <span>{title}</span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-bold text-zinc-700">
          {count}
        </span>
      </summary>
      <div className="border-t border-zinc-100 px-4 py-3">{children}</div>
    </details>
  );
}

function NoFormRows({ items }: { items: NoFormDistrict[] }) {
  if (items.length === 0) return <Empty>All districts have submitted.</Empty>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((d) => (
        <li key={d.name} className="flex items-center gap-2 text-sm text-zinc-800">
          <TierTag tier={d.tier} />
          <span className="flex-1">{d.shortName || d.name}</span>
          <span className="text-xs text-zinc-400">LDoS {formatLdos(d.ldos)}</span>
        </li>
      ))}
    </ul>
  );
}

// Each district with gaps is a click-to-expand row: the summary shows tier +
// name + gap count; expanding reveals every unmet field and what the CSM put.
function GapDistricts({ items }: { items: SubmittedDistrict[] }) {
  if (items.length === 0) return <Empty>No forms with gaps. 🎉</Empty>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((d) => (
        <li key={d.name}>
          <details
            className={`group/g rounded-lg border bg-white ${d.unmatched ? 'border-amber-300 bg-amber-50' : 'border-zinc-200'}`}
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50">
              <TierTag tier={d.tier} />
              <span className="font-semibold text-zinc-900">{d.name}</span>
              {d.coOwned && <Shared />}
              {d.formOwner && <FormOwnerNote owner={d.formOwner} />}
              {d.unmatched && (
                <span className="text-[11px] font-medium text-amber-700">⚠ unmatched district</span>
              )}
              <span className="ml-auto rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                {d.gapCount} gap{d.gapCount === 1 ? '' : 's'}
              </span>
              <span className="text-zinc-300 transition group-open/g:rotate-90">▸</span>
            </summary>
            <div className="border-t border-zinc-100 px-3 py-2">
              <ul className="flex flex-col gap-1">
                {d.gaps.map((g, i) => (
                  <li key={`${g.field}-${i}`} className="flex gap-2 text-xs">
                    <span className="min-w-[9rem] shrink-0 font-medium text-zinc-700">{g.field}</span>
                    <span
                      className="flex-1 truncate text-amber-700"
                      title={g.value || '(blank)'}
                    >
                      {g.value ? g.value : <span className="italic text-zinc-400">(blank)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function CleanRows({ items }: { items: SubmittedDistrict[] }) {
  if (items.length === 0) return <Empty>None fully complete yet.</Empty>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((d) => (
        <li key={d.name} className="flex flex-wrap items-center gap-2 text-sm text-zinc-800">
          <TierTag tier={d.tier} />
          <span className="font-medium">{d.name}</span>
          {d.coOwned && <Shared />}
          {d.formOwner && <FormOwnerNote owner={d.formOwner} />}
          {d.trainingStatus ? (
            <span className="ml-auto flex flex-wrap gap-1.5">
              <StatusPill status={d.trainingStatus} prefix="Training" />
              {d.kickoffStatus && <StatusPill status={d.kickoffStatus} prefix="Kickoff" />}
              {d.staffFileStatus && <StatusPill status={d.staffFileStatus} prefix="File" />}
            </span>
          ) : (
            <span className="ml-auto max-w-[60%] truncate text-xs text-zinc-500" title={d.familyComms}>
              {d.familyComms || '—'}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

// Per-owner readiness summary, organized by tier 1 → 3 (mirrors the main dash).
function TierSummaryTable({ byTier }: { byTier: Record<string, TierCount> }) {
  const tiers = ['1', '2', '3'].filter((t) => byTier[t] && byTier[t].total > 0);
  const sum = (k: keyof TierCount) =>
    tiers.reduce((acc, t) => acc + byTier[t][k], 0);
  if (tiers.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-[11px] uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2 font-medium">Tier</th>
            <th className="px-3 py-2 text-right font-medium">Districts</th>
            <th className="px-3 py-2 text-right font-medium">No form</th>
            <th className="px-3 py-2 text-right font-medium">Submitted</th>
            <th className="px-3 py-2 text-right font-medium">With gaps</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 tabular-nums">
          {tiers.map((t) => {
            const c = byTier[t];
            return (
              <tr key={t} className="text-zinc-800">
                <td className="px-3 py-1.5"><TierTag tier={Number(t)} /></td>
                <td className="px-3 py-1.5 text-right">{c.total}</td>
                <td className={`px-3 py-1.5 text-right ${c.noForm > 0 ? 'text-red-600' : 'text-zinc-400'}`}>{c.noForm}</td>
                <td className="px-3 py-1.5 text-right">{c.submitted}</td>
                <td className={`px-3 py-1.5 text-right ${c.withGaps > 0 ? 'text-amber-600 font-medium' : 'text-zinc-400'}`}>{c.withGaps}</td>
              </tr>
            );
          })}
          <tr className="bg-zinc-50 font-semibold text-zinc-900">
            <td className="px-3 py-1.5">Total</td>
            <td className="px-3 py-1.5 text-right">{sum('total')}</td>
            <td className="px-3 py-1.5 text-right">{sum('noForm')}</td>
            <td className="px-3 py-1.5 text-right">{sum('submitted')}</td>
            <td className="px-3 py-1.5 text-right">{sum('withGaps')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-zinc-400">{children}</p>;
}

function OwnerSection({ owner, groups }: { owner: string; groups: OwnerGroups }) {
  const submitted = groups.submitted ?? [];
  const withGaps = submitted.filter((d) => d.gapCount > 0);
  const clean = submitted.filter((d) => d.gapCount === 0);
  const total = groups.noForm.length + submitted.length;
  if (total === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-zinc-900">{owner}</h3>
      {groups.byTier && <TierSummaryTable byTier={groups.byTier} />}
      <Group icon="❌" title="No form submitted" count={groups.noForm.length} open={false}>
        <NoFormRows items={groups.noForm} />
      </Group>
      <Group icon="⚠️" title="Submitted — has gaps" count={withGaps.length} open={withGaps.length > 0}>
        <GapDistricts items={withGaps} />
      </Group>
      <Group icon="✅" title="Submitted — no gaps" count={clean.length} open={false}>
        <CleanRows items={clean} />
      </Group>
    </section>
  );
}

export function BtsView({ data }: { data: BtsData }) {
  const [selected, setSelected] = useState<string>('All');
  const t = data.totals;

  const ownersToShow =
    selected === 'All'
      ? data.ownerOrder.filter((o) => data.owners[o])
      : [selected].filter((o) => data.owners[o]);

  const schedRows =
    selected === 'All'
      ? data.scheduling
      : data.scheduling.filter((r) => r.owner === selected);

  const tabs = ['All', ...BTS_OWNER_TABS];

  return (
    <div className="flex flex-col gap-6">
      {/* Owner filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelected(tab)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              selected === tab
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {tab === 'All' ? 'All' : tab.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Stat pills */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Pill label="Forms submitted" value={t.formsSubmitted} total={t.totalDistricts} />
        <Pill label="No form yet" value={t.totalDistricts - t.formsSubmitted} countTone={t.totalDistricts - t.formsSubmitted > 0 ? 'text-red-600' : 'text-emerald-600'} />
        <Pill label="Submitted with gaps" value={t.formsWithGaps} countTone={t.formsWithGaps > 0 ? 'text-amber-600' : 'text-emerald-600'} />
        <Pill label="Submitted, no gaps" value={t.formsClean} countTone="text-emerald-600" />
      </dl>

      {/* Per-owner sections */}
      <div className="flex flex-col gap-8">
        {ownersToShow.map((owner) => (
          <OwnerSection key={owner} owner={owner} groups={data.owners[owner]} />
        ))}
      </div>

      {/* Scheduling summary */}
      <details className="group rounded-lg border border-zinc-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          📋 Scheduling summary (T1/T2)
          <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-bold text-zinc-700">
            {schedRows.length}
          </span>
        </summary>
        <div className="border-t border-zinc-100 p-3">
          <SchedulingTable rows={schedRows} />
        </div>
      </details>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { TierBadge } from '@/components/TierBadge';
import { BTS_OWNER_TABS } from '@/lib/bts';
import type {
  BtsData,
  CompleteDistrict,
  MissingDistrict,
  NoFormDistrict,
  OwnerGroups,
  SchedStatus,
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

function MissingCards({ items }: { items: MissingDistrict[] }) {
  if (items.length === 0) return <Empty>No forms with missing fields.</Empty>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <div
          key={d.name}
          className={`rounded-lg border bg-white p-3 ${d.unmatched ? 'border-amber-300 bg-amber-50' : 'border-zinc-200'}`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <TierTag tier={d.tier} />
            <span className="flex-1 text-sm font-semibold text-zinc-900">{d.name}</span>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
              {d.gapCount} gap{d.gapCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {d.coOwned && <Shared />}
            {d.formOwner && <FormOwnerNote owner={d.formOwner} />}
            {d.unmatched && (
              <span className="text-[11px] font-medium text-amber-700">⚠ unmatched district</span>
            )}
          </div>
          <ul className="mt-2 list-disc pl-4 text-xs text-zinc-600">
            {d.missingFields.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {(d.trainingStatus || d.kickoffStatus) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.trainingStatus && <StatusPill status={d.trainingStatus} prefix="Training" />}
              {d.kickoffStatus && <StatusPill status={d.kickoffStatus} prefix="Kickoff" />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CompleteRows({ items }: { items: CompleteDistrict[] }) {
  if (items.length === 0) return <Empty>None complete yet.</Empty>;
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

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-zinc-400">{children}</p>;
}

function OwnerSection({ owner, groups }: { owner: string; groups: OwnerGroups }) {
  const total = groups.noForm.length + groups.missing.length + groups.complete.length;
  if (total === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-zinc-900">{owner}</h3>
      <Group icon="❌" title="No form submitted" count={groups.noForm.length} open={groups.noForm.length > 0}>
        <NoFormRows items={groups.noForm} />
      </Group>
      <Group icon="⚠️" title="Form in — missing required fields" count={groups.missing.length} open={groups.missing.length > 0}>
        <MissingCards items={groups.missing} />
      </Group>
      <Group icon="✅" title="Complete — no gaps" count={groups.complete.length}>
        <CompleteRows items={groups.complete} />
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
        <Pill label="T1/T2 complete" value={t.t1t2Complete} total={t.t1t2Total} />
        <Pill label="T3 async complete" value={t.t3Complete} total={t.t3Total} />
        <Pill label="Districts with gaps" value={t.withGaps} countTone={t.withGaps > 0 ? 'text-amber-600' : 'text-emerald-600'} />
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

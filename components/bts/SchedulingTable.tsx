'use client';

import { useState } from 'react';
import type { SchedStatus, SchedulingRow } from '@/lib/bts';

type SortKey =
  | 'district'
  | 'owner'
  | 'trainingScheduled'
  | 'trainingDate'
  | 'kickoffStatus'
  | 'staffFileStatus';

const CELL_TONE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};

function StatusCell({ status }: { status: SchedStatus }) {
  return (
    <td className="px-3 py-2">
      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CELL_TONE[status.state]}`}>
        {status.label}
      </span>
    </td>
  );
}

function sortValue(row: SchedulingRow, key: SortKey): string {
  const v = row[key];
  return typeof v === 'string' ? v : (v as SchedStatus).label;
}

export function SchedulingTable({ rows }: { rows: SchedulingRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('owner');
  const [asc, setAsc] = useState(true);

  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-zinc-400">No T1/T2 scheduling data.</p>;
  }

  const sorted = [...rows].sort((a, b) => {
    const cmp = sortValue(a, sortKey).localeCompare(sortValue(b, sortKey));
    return asc ? cmp : -cmp;
  });

  function toggle(key: SortKey) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const cols: Array<{ key: SortKey; label: string }> = [
    { key: 'district', label: 'District' },
    { key: 'owner', label: 'Owner' },
    { key: 'trainingScheduled', label: 'Training Scheduled' },
    { key: 'trainingDate', label: 'Training Date' },
    { key: 'kickoffStatus', label: 'Kickoff Status' },
    { key: 'staffFileStatus', label: 'Staff File Status' },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                onClick={() => toggle(c.key)}
                className="cursor-pointer select-none px-3 py-3 text-left font-semibold hover:text-zinc-800"
              >
                {c.label}
                {sortKey === c.key && <span className="ml-1">{asc ? '▲' : '▼'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((r) => (
            <tr key={r.district} className="text-zinc-900">
              <td className="px-3 py-2 font-medium">{r.district}</td>
              <td className="px-3 py-2 text-zinc-600">{r.owner}</td>
              <StatusCell status={r.trainingScheduled} />
              <td className="px-3 py-2 tabular-nums text-zinc-700">{r.trainingDate}</td>
              <StatusCell status={r.kickoffStatus} />
              <StatusCell status={r.staffFileStatus} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { TierNum } from '@/lib/types';

interface Props {
  tierNum: TierNum;
}

const STYLES: Record<TierNum, { bg: string; fg: string; label: string }> = {
  1: { bg: 'bg-red-100', fg: 'text-red-800', label: 'T1' },
  2: { bg: 'bg-amber-100', fg: 'text-amber-800', label: 'T2' },
  3: { bg: 'bg-zinc-200', fg: 'text-zinc-700', label: 'T3' },
};

export function TierBadge({ tierNum }: Props) {
  const s = STYLES[tierNum];
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}

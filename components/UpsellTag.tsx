import type { UtilizationData } from '@/lib/types';

interface Props {
  util: UtilizationData;
}

export function UpsellTag({ util }: Props) {
  const blocked = util.insuranceBlockedStudents;
  const inNet = util.inNetworkStudents;
  const total = blocked + inNet;
  const pct = (util.insuranceBlockedPct * 100).toFixed(1);
  const tooltip =
    `${blocked} of ${total} students blocked by insurance (${pct}%) — ` +
    `district sponsorship opportunity.`;
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
    >
      💡 Upsell · {pct}% blocked
    </span>
  );
}

import type { UpsellData } from '@/lib/types';

interface Props {
  data: UpsellData;
}

export function UpsellTag({ data }: Props) {
  const uninsuredPct = data.uninsuredPct.toFixed(1);
  const tooltip =
    data.oon > 10
      ? `${data.uninsured} uninsured · ${data.oon} out-of-network · ${data.combinedPct.toFixed(1)}% of active caseload uncovered. District sponsorship could cover at no cost to families.`
      : `${data.uninsured} uninsured patients in care (${uninsuredPct}% of active caseload). District sponsorship could cover at no cost to families.`;
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
    >
      💡 Upsell · {uninsuredPct}% uninsured
    </span>
  );
}

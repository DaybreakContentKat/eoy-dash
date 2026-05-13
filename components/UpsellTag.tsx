import type { UpsellData } from '@/lib/types';

interface Props {
  data: UpsellData;
}

export function UpsellTag({ data }: Props) {
  const combinedPct = data.combinedPct.toFixed(1);
  const smallN = data.totalPatients < 20;
  const tooltip = smallN
    ? `${data.gap} patients without full coverage (${combinedPct}% of caseload — small caseload N=${data.totalPatients}, flag with caveat) · ${data.contract}.`
    : `${data.gap} patients without full coverage (${combinedPct}% of caseload) · ${data.contract}.`;
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
    >
      💡 Upsell · {data.gap} uncovered
    </span>
  );
}

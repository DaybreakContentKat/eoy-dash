import { PROJECT_URL } from '@/lib/config';
import { buildBatchBookingPrompt } from '@/lib/prompts';
import type { CSMConfig, District } from '@/lib/types';
import { CopyPromptButton } from './CopyPromptButton';

interface Props {
  csm: CSMConfig;
  districts: District[];
}

export function BatchActionBar({ csm, districts }: Props) {
  const bookingTargets = districts.filter(
    (d) => d.status === 'overdue' || d.status === 'schedule-soon',
  );
  const bookingPrompt = buildBatchBookingPrompt(csm, bookingTargets);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        This week's actions
      </h2>
      <p className="mt-1 text-xs text-zinc-600">
        Click <strong>Draft all booking emails</strong> to copy one prompt covering every overdue + schedule-soon
        district at once. Or use the individual button on each card below to handle one district at a time —
        prep packs are individual-only since they're heavier per district.
      </p>
      <div className="mt-3">
        <CopyPromptButton
          label={`📧 Draft all ${bookingTargets.length} booking email${bookingTargets.length === 1 ? '' : 's'}`}
          prompt={bookingPrompt}
          projectUrl={PROJECT_URL}
          variant="primary"
          disabled={bookingTargets.length === 0}
        />
      </div>
    </section>
  );
}

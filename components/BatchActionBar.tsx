import { PROJECT_URL } from '@/lib/config';
import { buildBatchBookingPrompt, buildBatchPrepPrompt } from '@/lib/prompts';
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
  const prepTargets = districts.filter((d) => d.status === 'booked');

  const bookingPrompt = buildBatchBookingPrompt(csm, bookingTargets);
  const prepPrompt = buildBatchPrepPrompt(csm, prepTargets);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        This week's batch actions
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Each button copies a prompt and opens your Claude project. Paste, send, and Claude executes
        all districts in one pass.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyPromptButton
          label={`📧 Draft ${bookingTargets.length} booking email${bookingTargets.length === 1 ? '' : 's'}`}
          prompt={bookingPrompt}
          projectUrl={PROJECT_URL}
          variant="primary"
          disabled={bookingTargets.length === 0}
        />
        <CopyPromptButton
          label={`📅 Build ${prepTargets.length} prep pack${prepTargets.length === 1 ? '' : 's'}`}
          prompt={prepPrompt}
          projectUrl={PROJECT_URL}
          variant="secondary"
          disabled={prepTargets.length === 0}
        />
      </div>
    </section>
  );
}

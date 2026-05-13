import { PROJECT_URL } from '@/lib/config';
import { buildBatchAsyncEmailPrompt, buildBatchBookingPrompt } from '@/lib/prompts';
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
  const asyncTargets = districts.filter(
    (d) => d.meetingType === 'async' && !d.completed && !d.asyncFormSent,
  );
  const bookingPrompt = buildBatchBookingPrompt(csm, bookingTargets);
  const asyncPrompt = buildBatchAsyncEmailPrompt(csm, asyncTargets);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        This week's actions
      </h2>
      <p className="mt-1 text-xs text-zinc-600">
        <strong>Draft booking emails</strong> covers every overdue + schedule-soon live-meeting district.
        <strong> Draft async partnership emails</strong> covers every async district whose form hasn't gone out
        yet — drafts come from <code>partnership@</code> in the team voice. Use individual buttons on cards for one-offs.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyPromptButton
          label={`📧 Draft all ${bookingTargets.length} booking email${bookingTargets.length === 1 ? '' : 's'}`}
          prompt={bookingPrompt}
          projectUrl={PROJECT_URL}
          variant="primary"
          disabled={bookingTargets.length === 0}
        />
        <CopyPromptButton
          label={`📨 Draft all ${asyncTargets.length} async partnership email${asyncTargets.length === 1 ? '' : 's'}`}
          prompt={asyncPrompt}
          projectUrl={PROJECT_URL}
          variant="secondary"
          disabled={asyncTargets.length === 0}
        />
      </div>
    </section>
  );
}

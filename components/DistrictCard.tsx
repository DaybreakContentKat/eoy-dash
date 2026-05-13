import { PROJECT_URL } from '@/lib/config';
import {
  buildIndividualAsyncEmailPrompt,
  buildIndividualBookingPrompt,
  buildIndividualPrepPrompt,
} from '@/lib/prompts';
import { formatNumber } from '@/lib/snapshot';
import type { CSMConfig, District } from '@/lib/types';
import { CopyPromptButton } from './CopyPromptButton';
import { TierBadge } from './TierBadge';
import { UpsellTag } from './UpsellTag';

interface Props {
  district: District;
  csm: CSMConfig;
}

export function DistrictCard({ district: d, csm }: Props) {
  const accent = accentClass(d);
  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm ${accent}`}
    >
      <header className="flex items-start gap-2">
        <TierBadge tierNum={d.tierNum} />
        <h3 className="flex-1 truncate text-sm font-semibold text-zinc-900" title={d.name}>
          {d.shortName || d.name}
        </h3>
        {d.isUpsellCandidate && d.upsellData && <UpsellTag data={d.upsellData} />}
      </header>

      <dl className="mt-2 space-y-1 text-xs text-zinc-600">
        {d.lastDayOfSchool && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">LDoS</dt>
            <dd className="tabular-nums">{formatShortDate(d.lastDayOfSchool)}</dd>
          </div>
        )}
        {d.bookingTarget && !d.booked && !d.completed && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">Book by</dt>
            <dd className="tabular-nums">{formatShortDate(d.bookingTarget)}</dd>
          </div>
        )}
        {d.meetingDate && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">Meeting</dt>
            <dd className="tabular-nums">{formatShortDate(d.meetingDate)}</dd>
          </div>
        )}
        {d.mpocs.length > 0 && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">MPOC</dt>
            <dd className="truncate text-right" title={d.mpocs.map((m) => `${m.name} <${m.email}>`).join('\n')}>
              {d.mpocs[0].name}
              {d.mpocs.length > 1 && (
                <span className="ml-1 text-zinc-400">+{d.mpocs.length - 1}</span>
              )}
            </dd>
          </div>
        )}
        {d.enrollment != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">Enrolled</dt>
            <dd className="tabular-nums">{formatNumber(d.enrollment)}</dd>
          </div>
        )}
        {d.ytdPacing != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-400">YTD pacing</dt>
            <dd className="tabular-nums">{Math.round(d.ytdPacing * 100)}%</dd>
          </div>
        )}
      </dl>

      {d.notes && (
        <p className="mt-2 line-clamp-2 text-[11px] italic text-zinc-500" title={d.notes}>
          {d.notes}
        </p>
      )}

      <div className="mt-3">
        <ActionButton district={d} csm={csm} />
      </div>
    </article>
  );
}

function ActionButton({ district: d, csm }: { district: District; csm: CSMConfig }) {
  if (d.completed) return null;
  if (d.meetingType === 'async') {
    if (d.asyncFormSent) {
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
          ✓ Form sent {formatShortDate(d.asyncFormSent)}
        </span>
      );
    }
    const noMpoc = d.mpocs.length === 0;
    return (
      <CopyPromptButton
        label={noMpoc ? '📨 Draft email (no MPOC — Claude will ask)' : '📨 Copy async email prompt'}
        prompt={buildIndividualAsyncEmailPrompt(csm, d)}
        projectUrl={PROJECT_URL}
        variant="compact"
      />
    );
  }
  if (d.booked) {
    return (
      <CopyPromptButton
        label="Copy prep prompt"
        prompt={buildIndividualPrepPrompt(csm, d)}
        projectUrl={PROJECT_URL}
        variant="compact"
      />
    );
  }
  return (
    <CopyPromptButton
      label={d.overdue ? 'Book now → draft' : 'Book → draft'}
      prompt={buildIndividualBookingPrompt(csm, d)}
      projectUrl={PROJECT_URL}
      variant="compact"
    />
  );
}

function accentClass(d: District): string {
  if (d.completed) return 'border-emerald-200';
  if (d.overdue) return 'border-red-200';
  if (d.booked) return 'border-emerald-200';
  return 'border-zinc-200';
}

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

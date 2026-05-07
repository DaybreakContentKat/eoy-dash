import type { GapToGoal } from '@/lib/types';
import { formatNumber } from '@/lib/snapshot';

interface Props {
  gap: GapToGoal;
  scope?: string;
}

export function GapToGoalBanner({ gap, scope = 'across the team' }: Props) {
  const behind = gap.thisWeekUrgent > gap.weeklyTarget;
  const onTrack = gap.unbooked === 0;

  if (onTrack) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
        <p className="text-base font-medium">
          ✓ Every needed call is booked. Nice work.
        </p>
      </div>
    );
  }

  const tone = behind
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-amber-200 bg-amber-50 text-amber-900';

  return (
    <div className={`rounded-lg border px-5 py-4 ${tone}`}>
      <p className="text-base">
        <span className="text-2xl font-semibold tabular-nums">
          {formatNumber(gap.unbooked)}
        </span>{' '}
        districts still unbooked.{' '}
        <span className="font-semibold">
          Book {formatNumber(gap.weeklyTarget)} per week {scope}
        </span>{' '}
        to hit 100% before school ends.
        {behind && gap.atRisk > 0 && (
          <span className="mt-1 block text-sm font-medium">
            ⚠ {formatNumber(gap.atRisk)} districts have booking windows closing within 7 days.
          </span>
        )}
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';

interface Props {
  label: string;
  prompt: string;
  projectUrl: string;
  variant?: 'primary' | 'secondary' | 'compact';
  disabled?: boolean;
}

export function CopyPromptButton({
  label,
  prompt,
  projectUrl,
  variant = 'primary',
  disabled = false,
}: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleClick() {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setState('copied');
      window.open(projectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={classFor(variant, state, disabled)}
    >
      {state === 'copied' ? '✓ Copied · opening project…' : state === 'error' ? '✗ Copy failed' : label}
    </button>
  );
}

function classFor(
  variant: 'primary' | 'secondary' | 'compact',
  state: 'idle' | 'copied' | 'error',
  disabled: boolean,
): string {
  const base =
    'inline-flex items-center justify-center rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-40';
  const sizing =
    variant === 'compact'
      ? 'px-2.5 py-1 text-xs'
      : 'px-4 py-2 text-sm';
  const tone =
    state === 'copied'
      ? 'bg-emerald-600 text-white'
      : state === 'error'
        ? 'bg-red-600 text-white'
        : variant === 'primary'
          ? 'bg-zinc-900 text-white hover:bg-zinc-800'
          : variant === 'secondary'
            ? 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50';
  return `${base} ${sizing} ${tone}${disabled ? '' : ' cursor-pointer'}`;
}

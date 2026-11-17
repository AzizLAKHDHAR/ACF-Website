import type * as React from 'react';
import { cn } from '@/lib/utils';

const tones = {
  neutral: 'border-border text-muted-foreground',
  strong: 'border-foreground',
  primary: 'border-primary-border bg-primary text-primary-foreground',
  danger: 'border-destructive text-destructive',
} as const;

/** A short status word in a rounded outline (the word carries the meaning, never the colour alone). */
export function Pill({
  tone = 'neutral',
  children,
  className,
  testId,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        'inline-flex w-fit items-center rounded-full border-2 px-3 py-0.5 text-xs font-bold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

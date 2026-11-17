import type * as React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Frame of a page in a hidden area: an optional way back, the heading, its lead, then the content. */
export function AreaPage({
  title,
  description,
  titleDir,
  back,
  wide = false,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** `auto` for titles people wrote (meetings, tasks, polls). */
  titleDir?: 'auto';
  back?: { href: string; label: string };
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mx-auto flex flex-col gap-8 px-4 py-10 sm:px-6',
        wide ? 'max-w-6xl' : 'max-w-4xl',
      )}
    >
      <header className="flex flex-col gap-2">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
          >
            <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-balance" dir={titleDir}>
          {title}
        </h1>
        {description ? <div className="text-muted-foreground">{description}</div> : null}
      </header>
      {children}
    </div>
  );
}

/** A titled block inside an area page; the heading names the region for assistive technology. */
export function AreaSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-xl font-bold">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

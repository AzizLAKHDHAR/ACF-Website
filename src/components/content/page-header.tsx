import type * as React from 'react';
import { CamoBackground } from '@/components/brand/brand-sections';

/** Top of every public list and detail page: camo band, title, optional lead and actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  children,
  titleDir,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  children?: React.ReactNode;
  titleDir?: 'auto';
}) {
  return (
    <section className="relative overflow-hidden border-b">
      <CamoBackground />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:px-6 sm:py-16">
        {eyebrow ? <p className="text-sm font-semibold text-muted-foreground">{eyebrow}</p> : null}
        <h1
          className="max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
          dir={titleDir}
        >
          {title}
        </h1>
        {description ? <div className="max-w-2xl text-lg text-pretty">{description}</div> : null}
        {children}
      </div>
    </section>
  );
}

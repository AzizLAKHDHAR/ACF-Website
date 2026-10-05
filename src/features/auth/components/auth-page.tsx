import type * as React from 'react';

/** Narrow, centered column shared by the sign-in, sign-up and password pages. */
export function AuthPage({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      {children}
      {footer ? <footer className="border-t pt-6 text-sm">{footer}</footer> : null}
    </div>
  );
}

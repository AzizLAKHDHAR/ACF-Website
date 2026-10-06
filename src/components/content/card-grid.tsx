import type * as React from 'react';

export function CardGrid({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </ul>
  );
}

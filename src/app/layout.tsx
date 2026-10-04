import type * as React from 'react';

// Pass-through: the real root layout, with <html lang dir>, is app/[locale]/layout.tsx.
// This file only exists because app/not-found.tsx needs a root layout.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

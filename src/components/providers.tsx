'use client';

import type * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { Direction } from 'radix-ui';
import type { Direction as TextDirection } from '@/i18n/locale';

/** Client-side context for the whole app: colour theme and reading direction for Radix. */
export function Providers({ dir, children }: { dir: TextDirection; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Direction.Provider dir={dir}>{children}</Direction.Provider>
    </ThemeProvider>
  );
}

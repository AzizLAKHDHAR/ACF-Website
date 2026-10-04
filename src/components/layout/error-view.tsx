'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/** Localized body of the error boundary (app/[locale]/error.tsx). */
export function ErrorView({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('error');

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 py-24 text-center focus:outline-none"
    >
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('description')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry}>{t('retry')}</Button>
        <Button asChild variant="outline">
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>
    </main>
  );
}

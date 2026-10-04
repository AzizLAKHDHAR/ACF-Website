import { useTranslations } from 'next-intl';

/** First focusable element on every page; jumps keyboard users past the navigation. */
export function SkipLink() {
  const t = useTranslations('common');

  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
    >
      {t('skipToContent')}
    </a>
  );
}

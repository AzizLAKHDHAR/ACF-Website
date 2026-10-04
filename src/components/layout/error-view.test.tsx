import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import { ErrorView } from './error-view';

// The locale-aware Link needs the Next.js router; a plain anchor is enough here.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const catalogs = { ar, fr, en } as const;

describe('ErrorView', () => {
  it.each(Object.keys(catalogs) as Array<keyof typeof catalogs>)('is localized in %s', (locale) => {
    const messages = catalogs[locale];
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ErrorView onRetry={() => {}} />
      </NextIntlClientProvider>,
    );
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replaceAll('&#x27;', "'")
      .replaceAll('&amp;', '&');
    expect(text).toContain(messages.error.title);
    expect(text).toContain(messages.error.retry);
    expect(text).toContain(messages.error.backHome);
  });
});

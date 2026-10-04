import type { Metadata, Viewport } from 'next';
import { Alexandria, Outfit } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Providers } from '@/components/providers';
import { getDirection, openGraphLocale } from '@/i18n/locale';
import { routing } from '@/i18n/routing';
import { publicEnv } from '@/lib/env';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { cn } from '@/lib/utils';
import '../globals.css';

// The charter's Rokiest / GC Arturm are commercial and not supplied as web fonts; Outfit (Latin) and
// Alexandria (Arabic) match the typography of the ACF one-pager (docs/brand.md, D-045).
const latin = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-latin',
  display: 'swap',
});
const arabic = Alexandria({ subsets: ['arabic'], variable: '--font-arabic', display: 'swap' });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: t('title'), template: `%s · ${t('siteName')}` },
    description: t('description'),
    applicationName: t('siteName'),
    openGraph: { siteName: t('siteName'), locale: openGraphLocale[locale], type: 'website' },
    twitter: { card: 'summary' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  // Browser chrome can't read CSS variables: these mirror --background in light and dark (globals.css).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#181414' },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const locale = await resolveLocaleParam(params);
  const dir = getDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={cn(latin.variable, arabic.variable)}
      // next-themes sets the theme class before hydration.
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <Providers dir={dir}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

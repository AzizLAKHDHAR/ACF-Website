import type { Metadata } from 'next';
import { ArrowRightIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { publicHref, publicSections } from '@/config/navigation';
import { publicSectionIcons } from '@/config/icons';
import { Link } from '@/i18n/navigation';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    ...pageMetadata({ locale, path: '', description: t('description') }),
    title: { absolute: t('title') },
  };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale });

  return (
    <>
      <section className="border-b bg-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">{t('home.intro')}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={publicHref.artists}>
                {t('home.ctaArtists')}
                <ArrowRightIcon className="rtl:rotate-180" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={publicHref.events}>{t('home.ctaEvents')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="explore" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="explore" className="mb-8 text-2xl font-semibold tracking-tight">
          {t('home.sectionsTitle')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicSections.map((section) => {
            const Icon = publicSectionIcons[section];
            return (
              <li key={section}>
                <Link
                  href={publicHref[section]}
                  className="group flex h-full flex-col gap-3 rounded-lg border bg-card p-5 text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="size-6 text-muted-foreground" aria-hidden />
                  <span className="text-lg font-medium">{t(`pages.${section}.title`)}</span>
                  <span className="text-sm text-muted-foreground">
                    {t(`pages.${section}.description`)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  AxesSection,
  CamoBackground,
  GenreStrip,
  MembersSection,
  ValuesList,
} from '@/components/brand/brand-sections';
import { Lockup } from '@/components/layout/logo';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

// Copy comes from ACF's one-pager (/brand), in its own French, English and Arabic versions.
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/about'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.about' });
  return pageMetadata({ locale, path: '/about', title: t('title'), description: t('description') });
}

export default async function AboutPage({ params }: PageProps<'/[locale]/about'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale });

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <CamoBackground />
        <div className="relative mx-auto flex max-w-4xl flex-col items-start gap-8 px-4 py-16 sm:px-6">
          <h1 className="sr-only">{t('pages.about.title')}</h1>
          <Lockup className="max-w-xl text-foreground" />
          <p className="max-w-3xl font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {t('footer.tagline')}
          </p>
          <GenreStrip />
        </div>
      </section>

      <div className="mx-auto flex max-w-4xl flex-col gap-16 px-4 py-16 sm:px-6">
        <section aria-labelledby="who-title" className="flex flex-col gap-4">
          <h2 id="who-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('brand.whoTitle')}
          </h2>
          <p className="text-lg leading-relaxed">{t('brand.whoBody')}</p>
        </section>
        <ValuesList />
        <AxesSection />
        <MembersSection />
      </div>
    </>
  );
}

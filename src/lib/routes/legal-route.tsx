import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/content/page-header';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

// Draft legal texts (messages → content.legal), shown with a notice until ACF validates them.
const sections = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

export function legalRoute(page: 'privacy' | 'terms') {
  const path = `/legal/${page}`;

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const locale = await resolveLocaleParam(params);
    const t = await getTranslations({ locale, namespace: `pages.${page}` });
    return pageMetadata({ locale, path, title: t('title'), description: t('description') });
  }

  async function Page({ params }: Props) {
    const locale = await resolveLocaleParam(params);
    const t = await getTranslations({ locale });
    return (
      <>
        <PageHeader
          title={t(`pages.${page}.title`)}
          description={<p>{t(`pages.${page}.description`)}</p>}
        />
        <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
          <p role="note" className="rounded-xl border-2 border-dashed px-4 py-3 font-semibold">
            {t('content.legal.draft')}
          </p>
          {sections.map((section) => (
            <section
              key={section}
              aria-labelledby={`${page}-${section}`}
              className="flex flex-col gap-2"
            >
              <h2 id={`${page}-${section}`} className="text-xl font-extrabold">
                {t(`content.legal.${page}.${section}.title`)}
              </h2>
              <p className="leading-relaxed">{t(`content.legal.${page}.${section}.body`)}</p>
            </section>
          ))}
        </article>
      </>
    );
  }

  return { generateMetadata, Page };
}

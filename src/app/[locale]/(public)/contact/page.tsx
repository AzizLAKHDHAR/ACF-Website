import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/content/page-header';
import { ContactForm } from '@/features/contact/components/contact-form';
import { isContactConfigured } from '@/features/contact/send';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.contact' });
  return pageMetadata({
    locale,
    path: '/contact',
    title: t('title'),
    description: t('description'),
  });
}

export default async function ContactPage({ params }: PageProps<'/[locale]/contact'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale });

  return (
    <>
      <PageHeader
        title={t('pages.contact.title')}
        description={<p>{t('content.contact.intro')}</p>}
      />
      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {isContactConfigured() ? (
          <ContactForm />
        ) : (
          <p role="status" className="rounded-xl border-2 px-4 py-3 font-semibold">
            {t('content.contact.unavailable')}
          </p>
        )}
      </div>
    </>
  );
}

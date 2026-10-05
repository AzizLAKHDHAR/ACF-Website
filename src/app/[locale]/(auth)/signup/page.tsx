import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPage } from '@/features/auth/components/auth-page';
import { SignUpForm } from '@/features/auth/components/signup-form';
import { Link } from '@/i18n/navigation';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/signup'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.signup' });
  return pageMetadata({
    locale,
    path: '/signup',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

export default async function SignUpPage({ params }: PageProps<'/[locale]/signup'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale });

  return (
    <AuthPage
      title={t('pages.signup.title')}
      description={t('pages.signup.description')}
      footer={
        <p>
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="font-semibold underline underline-offset-4">
            {t('auth.signInLink')}
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthPage>
  );
}

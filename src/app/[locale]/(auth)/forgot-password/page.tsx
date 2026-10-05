import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPage } from '@/features/auth/components/auth-page';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { Link } from '@/i18n/navigation';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/forgot-password'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.forgotPassword' });
  return pageMetadata({
    locale,
    path: '/forgot-password',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<'/[locale]/forgot-password'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale });

  return (
    <AuthPage
      title={t('pages.forgotPassword.title')}
      description={t('pages.forgotPassword.description')}
      footer={
        <Link href="/login" className="font-semibold underline underline-offset-4">
          {t('auth.backToSignIn')}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}

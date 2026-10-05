import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPage } from '@/features/auth/components/auth-page';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

// Reached from a recovery link (which signs the user in) or from the account page; the
// (account) layout requires a session.
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reset-password'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.resetPassword' });
  return pageMetadata({
    locale,
    path: '/reset-password',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

export default async function ResetPasswordPage({ params }: PageProps<'/[locale]/reset-password'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.resetPassword' });
  return (
    <AuthPage title={t('title')} description={t('description')}>
      <ResetPasswordForm />
    </AuthPage>
  );
}

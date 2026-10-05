import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPage } from '@/features/auth/components/auth-page';
import { LoginForm } from '@/features/auth/components/login-form';
import { safeNextPath } from '@/features/auth/schemas';
import { Link } from '@/i18n/navigation';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.login' });
  return pageMetadata({
    locale,
    path: '/login',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

export default async function LoginPage({ params, searchParams }: PageProps<'/[locale]/login'>) {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale });
  const query = await searchParams;
  const next = typeof query.next === 'string' ? safeNextPath(query.next) : undefined;

  return (
    <AuthPage
      title={t('pages.login.title')}
      description={t('pages.login.description')}
      footer={
        <p>
          {t('auth.noAccount')}{' '}
          <Link href="/signup" className="font-semibold underline underline-offset-4">
            {t('auth.createAccountLink')}
          </Link>
        </p>
      }
    >
      {query.error === 'link' ? (
        <p
          role="alert"
          className="rounded-xl border-2 border-destructive px-4 py-3 text-sm text-destructive"
        >
          {t('auth.notices.linkInvalid')}
        </p>
      ) : null}
      <LoginForm next={next} />
    </AuthPage>
  );
}

import { PublicShell } from '@/components/layout/public-shell';
import { redirect } from '@/i18n/navigation';
import { getSessionUser } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';

// Sign-in, sign-up and forgot-password are for signed-out visitors; signed-in users go to their account.
export default async function AuthLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const locale = await resolveLocaleParam(params);
  if (await getSessionUser()) redirect({ href: '/account', locale });
  return <PublicShell>{children}</PublicShell>;
}

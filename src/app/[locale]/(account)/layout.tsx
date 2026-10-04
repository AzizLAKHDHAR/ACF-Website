import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/public-shell';
import { requireUser } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children, params }: LayoutProps<'/[locale]'>) {
  await resolveLocaleParam(params);
  await requireUser();
  return <PublicShell>{children}</PublicShell>;
}

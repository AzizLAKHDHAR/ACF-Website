import type { Metadata } from 'next';
import { AreaShell } from '@/components/layout/area-shell';
import { requireRole } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: LayoutProps<'/[locale]/admin'>) {
  await resolveLocaleParam(params);
  await requireRole('admin');
  return <AreaShell area="admin">{children}</AreaShell>;
}

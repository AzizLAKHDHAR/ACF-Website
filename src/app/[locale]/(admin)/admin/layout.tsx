import type { Metadata } from 'next';
import { AreaShell } from '@/components/layout/area-shell';
import { countUnreadNotifications } from '@/features/notifications/queries';
import { requireRole } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: LayoutProps<'/[locale]/admin'>) {
  await resolveLocaleParam(params);
  const user = await requireRole('admin', { returnTo: '/admin' });
  const unread = await countUnreadNotifications(user.id);
  return (
    <AreaShell area="admin" unread={unread}>
      {children}
    </AreaShell>
  );
}

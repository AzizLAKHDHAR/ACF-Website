import type { Metadata } from 'next';
import { AreaShell } from '@/components/layout/area-shell';
import { countUnreadNotifications } from '@/features/notifications/queries';
import { requireRole } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MemberLayout({ children, params }: LayoutProps<'/[locale]/member'>) {
  await resolveLocaleParam(params);
  const user = await requireRole('member', { returnTo: '/member' });
  const unread = await countUnreadNotifications(user.id);
  return (
    <AreaShell area="member" unread={unread}>
      {children}
    </AreaShell>
  );
}

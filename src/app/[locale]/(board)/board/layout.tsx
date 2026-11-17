import type { Metadata } from 'next';
import { AreaShell } from '@/components/layout/area-shell';
import { countUnreadNotifications } from '@/features/notifications/queries';
import { requireRole } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BoardLayout({ children, params }: LayoutProps<'/[locale]/board'>) {
  await resolveLocaleParam(params);
  const user = await requireRole('board', { returnTo: '/board' });
  const unread = await countUnreadNotifications(user.id);
  return (
    <AreaShell area="board" unread={unread}>
      {children}
    </AreaShell>
  );
}

import type { Metadata } from 'next';
import { AreaShell } from '@/components/layout/area-shell';
import { requireRole } from '@/lib/auth/guards';
import { resolveLocaleParam } from '@/lib/i18n-params';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BoardLayout({ children, params }: LayoutProps<'/[locale]/board'>) {
  await resolveLocaleParam(params);
  await requireRole('board', { returnTo: '/board' });
  return <AreaShell area="board">{children}</AreaShell>;
}

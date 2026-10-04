import { PublicShell } from '@/components/layout/public-shell';
import { resolveLocaleParam } from '@/lib/i18n-params';

export default async function PublicLayout({ children, params }: LayoutProps<'/[locale]'>) {
  // Layouts render independently of their parent; set the locale here too to stay static.
  await resolveLocaleParam(params);
  return <PublicShell>{children}</PublicShell>;
}

import { PublicShell } from '@/components/layout/public-shell';
import { resolveLocaleParam } from '@/lib/i18n-params';

// Phase 2: redirect signed-in users away from these pages.
export default async function AuthLayout({ children, params }: LayoutProps<'/[locale]'>) {
  await resolveLocaleParam(params);
  return <PublicShell>{children}</PublicShell>;
}

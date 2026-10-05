import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/actions';
import { Link } from '@/i18n/navigation';
import { getSessionRole, requireUser } from '@/lib/auth/guards';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'pages.account' });
  return pageMetadata({
    locale,
    path: '/account',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

const spaces = ['member', 'board', 'admin'] as const;

// Phase 2 shows who you are and where you can go; profile management arrives in phase 4.
export default async function AccountPage({ params }: PageProps<'/[locale]/account'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireUser({ returnTo: '/account' });
  const t = await getTranslations({ locale });
  const supabase = await createClient();
  const [{ data: account }, role] = await Promise.all([
    supabase.from('accounts').select('display_name').eq('id', user.id).maybeSingle(),
    getSessionRole(),
  ]);
  const reachable = spaces.filter((space) => hasRoleAtLeast(role, space));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('pages.account.title')}</h1>
        {user.email ? (
          <p className="text-muted-foreground">
            {t('auth.account.signedInAs', { email: user.email })}
          </p>
        ) : null}
      </header>

      <dl className="grid gap-4 rounded-2xl border-2 p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('auth.account.displayName')}</dt>
          <dd className="font-semibold">
            {/* User-generated text keeps its own direction without moving the layout. */}
            <bdi>{account?.display_name}</bdi>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('auth.account.role')}</dt>
          <dd className="font-semibold" data-testid="account-role">
            {role ? t(`auth.account.roles.${role}`) : t('auth.account.noRole')}
          </dd>
        </div>
      </dl>

      {reachable.length > 0 ? (
        <nav aria-labelledby="spaces-title" className="flex flex-col gap-3">
          <h2 id="spaces-title" className="text-lg font-bold">
            {t('auth.account.spaces')}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {reachable.map((space) => (
              <li key={space}>
                <Button asChild variant="outline">
                  <Link href={`/${space}`}>{t(`areas.${space}.name`)}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t pt-6">
        <Link href="/reset-password" className="text-sm underline underline-offset-4">
          {t('auth.account.changePassword')}
        </Link>
        <form action={signOut} className="ms-auto">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="secondary">
            {t('auth.signOutButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { useSyncExternalStore } from 'react';
import { Link } from '@/i18n/navigation';

// Supabase's SSR auth cookie (`sb-<project>-auth-token`, possibly chunked) is readable by scripts.
// Its presence only picks a label; the account page itself checks the session on the server.
const hasAuthCookie = () => /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);
const subscribe = () => () => {};

/**
 * "Sign in" for visitors, "My account" once signed in. A client island so the public pages around
 * it stay static; the server render (and first paint) always says "Sign in".
 */
export function AuthLink(props: Omit<React.ComponentProps<typeof Link>, 'href' | 'children'>) {
  const t = useTranslations();
  const signedIn = useSyncExternalStore(subscribe, hasAuthCookie, () => false);
  return (
    <Link href={signedIn ? '/account' : '/login'} {...props}>
      {signedIn ? t('auth.accountLink') : t('common.signIn')}
    </Link>
  );
}

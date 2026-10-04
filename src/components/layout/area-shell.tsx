import type * as React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Area } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { AreaMobileNav, AreaSidebarNav } from './area-nav';
import { LocaleSwitcher } from './locale-switcher';
import { Logo } from './logo';
import { SkipLink } from './skip-link';
import { ThemeToggle } from './theme-toggle';

/** Chrome of the hidden areas (member, board, admin): top bar + section sidebar. */
export function AreaShell({ area, children }: { area: Area; children: React.ReactNode }) {
  const t = useTranslations();

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
          <AreaMobileNav area={area} className="lg:hidden" />
          <Logo />
          <span className="truncate border-s ps-3 text-sm font-medium text-muted-foreground">
            {t(`areas.${area}.name`)}
          </span>
          <div className="ms-auto flex items-center gap-1">
            <Link
              href="/"
              className="hidden h-10 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:inline-flex"
            >
              <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
              {t('common.backToSite')}
            </Link>
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-e bg-muted lg:block">
          <AreaSidebarNav area={area} />
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

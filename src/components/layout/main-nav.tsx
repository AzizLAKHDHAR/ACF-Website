'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  catalogueSections,
  headerLinks,
  headerLinksAfterDiscover,
  publicHref,
  type PublicPage,
} from '@/config/navigation';
import { publicSectionIcons } from '@/config/icons';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation: News · Events · Discover ▾ · Blogs · About. */
export function MainNav({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const discoverActive = catalogueSections.some((key) => isActive(pathname, publicHref[key]));

  const navLink = (key: PublicPage) => {
    const active = isActive(pathname, publicHref[key]);
    return (
      <li key={key}>
        <Link
          href={publicHref[key]}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'inline-flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
            active ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {t(key)}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={t('primary')} className={className}>
      <ul className="flex items-center gap-1">
        {headerLinks.map(navLink)}
        <li>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'px-3 data-[state=open]:bg-accent',
                  discoverActive ? 'text-foreground' : 'text-muted-foreground',
                )}
                data-testid="discover-trigger"
              >
                {t('discover')}
                <ChevronDownIcon
                  aria-hidden
                  className="transition-transform in-data-[state=open]:rotate-180"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {catalogueSections.map((key) => {
                const Icon = publicSectionIcons[key];
                const active = isActive(pathname, publicHref[key]);
                return (
                  <DropdownMenuItem key={key} asChild>
                    <Link href={publicHref[key]} aria-current={active ? 'page' : undefined}>
                      <Icon aria-hidden />
                      {t(key)}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
        {headerLinksAfterDiscover.map(navLink)}
      </ul>
    </nav>
  );
}

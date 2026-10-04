'use client';

import { MenuIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { infoPages, publicHref, publicSections, type PublicPage } from '@/config/navigation';
import { publicSectionIcons } from '@/config/icons';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Small-screen navigation in a drawer that opens from the inline end (right in LTR, left in RTL). */
export function MobileNav({ className }: { className?: string }) {
  const t = useTranslations();
  const pathname = usePathname();

  const item = (key: PublicPage) => {
    const href = publicHref[key];
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const Icon =
      key in publicSectionIcons ? publicSectionIcons[key as keyof typeof publicSectionIcons] : null;
    return (
      <li key={key}>
        <SheetClose asChild>
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 text-base transition-colors hover:bg-accent hover:text-accent-foreground',
              active && 'bg-accent text-accent-foreground',
            )}
          >
            {Icon ? <Icon className="size-5 text-muted-foreground" aria-hidden /> : null}
            {t(`nav.${key}`)}
          </Link>
        </SheetClose>
      </li>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={t('common.openMenu')}
          data-testid="mobile-menu-trigger"
        >
          <MenuIcon className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="end" closeLabel={t('common.closeMenu')} aria-describedby={undefined}>
        <SheetHeader className="border-b">
          <SheetTitle>{t('common.menu')}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t('nav.primary')} className="flex-1 overflow-y-auto px-2 pb-6">
          <ul className="flex flex-col gap-1">{publicSections.map(item)}</ul>
          <ul className="mt-4 flex flex-col gap-1 border-t pt-4">{infoPages.map(item)}</ul>
          <div className="mt-6 px-3">
            <Button asChild className="w-full">
              <SheetClose asChild>
                <Link href="/login">{t('common.signIn')}</Link>
              </SheetClose>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

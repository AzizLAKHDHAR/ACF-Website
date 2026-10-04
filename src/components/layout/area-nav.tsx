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
import { areaSectionHref, areaSections, type Area, type AreaSection } from '@/config/navigation';
import { areaSectionIcon } from '@/config/icons';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

function AreaLinks<A extends Area>({ area, inSheet = false }: { area: A; inSheet?: boolean }) {
  const t = useTranslations('areas');
  const pathname = usePathname();
  const sections = areaSections[area] as readonly AreaSection<A>[];

  return (
    <ul className="flex flex-col gap-1">
      {sections.map((section) => {
        const href = areaSectionHref(area, section);
        const active = pathname === href;
        const Icon = areaSectionIcon(area, section);
        const link = (
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
              active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(`${area}.sections.${section}.title` as Parameters<typeof t>[0])}
          </Link>
        );
        return <li key={section}>{inSheet ? <SheetClose asChild>{link}</SheetClose> : link}</li>;
      })}
    </ul>
  );
}

/** Sidebar navigation of a hidden area (desktop). */
export function AreaSidebarNav({ area }: { area: Area }) {
  const t = useTranslations('areas');
  return (
    <nav aria-label={t('label')} className="p-3">
      <AreaLinks area={area} />
    </nav>
  );
}

/** Drawer navigation of a hidden area (small screens); opens from the inline start. */
export function AreaMobileNav({ area, className }: { area: Area; className?: string }) {
  const t = useTranslations();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={t('common.openMenu')}
          data-testid="area-menu-trigger"
        >
          <MenuIcon className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="start" closeLabel={t('common.closeMenu')} aria-describedby={undefined}>
        <SheetHeader className="border-b">
          <SheetTitle>{t(`areas.${area}.name`)}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t('areas.label')} className="flex-1 overflow-y-auto px-2 pb-6">
          <AreaLinks area={area} inSheet />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

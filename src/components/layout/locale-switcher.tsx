'use client';

import { CheckIcon, LanguagesIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * Switches language on the current page. Each option is a real link (works without JS);
 * next-intl writes the NEXT_LOCALE cookie on switch so the choice persists (one year).
 */
export function LocaleSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10"
          aria-label={t('common.changeLanguage')}
          data-testid="locale-switcher"
        >
          <LanguagesIcon aria-hidden />
          <span className="hidden sm:inline">{t(`localeNames.${locale}`)}</span>
          <span className="uppercase sm:hidden">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('common.language')}</DropdownMenuLabel>
        {routing.locales.map((option) => (
          <DropdownMenuItem key={option} asChild>
            <Link
              href={pathname}
              locale={option}
              lang={option}
              hrefLang={option}
              aria-current={option === locale ? 'true' : undefined}
              data-testid={`locale-option-${option}`}
            >
              <span className="flex-1">{t(`localeNames.${option}`)}</span>
              {option === locale ? <CheckIcon aria-hidden /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

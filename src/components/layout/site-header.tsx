import { SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { AuthLink } from './auth-link';
import { LocaleSwitcher } from './locale-switcher';
import { Logo } from './logo';
import { MainNav } from './main-nav';
import { MobileNav } from './mobile-nav';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const t = useTranslations('common');
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <MainNav className="hidden lg:block" />
        <div className="ms-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link href="/search" aria-label={t('search')}>
              <SearchIcon className="size-5" aria-hidden />
            </Link>
          </Button>
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild variant="outline" size="sm" className="ms-1 hidden h-10 sm:inline-flex">
            <AuthLink />
          </Button>
          <MobileNav className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}

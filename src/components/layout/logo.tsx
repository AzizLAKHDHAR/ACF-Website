import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * PLACEHOLDER wordmark until the ACF logo is provided (docs/brand.md → Logo).
 * Logos are never mirrored in RTL; only their position moves.
 */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations();

  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2 rounded-md font-semibold', className)}
      aria-label={`${t('metadata.siteName')} — ${t('common.home')}`}
    >
      <span
        aria-hidden
        className="inline-flex h-9 items-center rounded-md bg-primary px-2.5 text-sm font-bold tracking-wider text-primary-foreground"
        dir="ltr"
      >
        {t('metadata.siteName')}
      </span>
    </Link>
  );
}

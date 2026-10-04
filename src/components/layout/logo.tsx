import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// Forced-colors mode replaces background colours, which would erase a mask-painted logo; paint it
// with the system text colour instead.
const MASK_CLASSES =
  'bg-current mask-contain mask-center mask-no-repeat forced-colors:bg-[CanvasText] forced-colors:forced-color-adjust-none';

/**
 * Brand marks, rendered as CSS masks filled with the current text colour so one asset works in
 * light and dark themes. Sources are alpha masks extracted from /brand (D-046); swap them for the
 * vector logo when ACF provides one. Logos are never mirrored in RTL; only their position moves.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block aspect-[460/159] h-8 mask-[url(/brand/amplify-wordmark.png)]',
        MASK_CLASSES,
        className,
      )}
    />
  );
}

/** Full "Amplify Creative Foundation" lockup. Decorative: give the surrounding element a name. */
export function Lockup({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block aspect-[1652/665] w-full mask-[url(/brand/amplify-lockup.png)]',
        MASK_CLASSES,
        className,
      )}
    />
  );
}

/** Header/footer logo linking to the home page. */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations();

  return (
    <Link
      href="/"
      className={cn('inline-flex items-center rounded-md text-foreground', className)}
      aria-label={`${t('metadata.siteName')} — ${t('common.home')}`}
    >
      <Wordmark />
    </Link>
  );
}

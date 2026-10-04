import { useTranslations } from 'next-intl';
import {
  catalogueSections,
  infoPages,
  legalPages,
  publicHref,
  type PublicPage,
} from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';

const columns: Array<{
  title: 'discover' | 'association' | 'legal';
  links: readonly PublicPage[];
}> = [
  { title: 'discover', links: ['news', 'events', ...catalogueSections, 'blogs'] },
  { title: 'association', links: infoPages },
  { title: 'legal', links: legalPages },
];

export function SiteFooter() {
  const t = useTranslations();
  // Static pages are rendered at build time; the year is that of the last deploy.
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_repeat(3,1fr)]">
        <div className="flex flex-col items-start gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t('footer.tagline')}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-labelledby={`footer-${column.title}`}>
            <h2 id={`footer-${column.title}`} className="mb-3 text-sm font-semibold">
              {t(`footer.${column.title}`)}
            </h2>
            <ul className="flex flex-col gap-1">
              {column.links.map((key) => (
                <li key={key}>
                  <Link
                    href={publicHref[key]}
                    className="inline-flex min-h-8 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          {t('footer.rights', { year })}
        </p>
      </div>
    </footer>
  );
}

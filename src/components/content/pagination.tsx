import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { toQuery, type ListParams } from '@/lib/content/params';

/** Previous/next links that keep the current filters. Renders nothing for a single page. */
export async function Pagination({
  pathname,
  params,
  total,
  pageSize,
}: {
  pathname: string;
  params: ListParams;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const t = await getTranslations('content.pagination');
  const page = Math.min(params.page, pages);
  return (
    <nav aria-label={t('label')} className="flex items-center justify-between gap-4 pt-6">
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={{ pathname, query: toQuery(params, { page: page - 1 }) }} rel="prev">
            <ArrowLeftIcon className="rtl:rotate-180" aria-hidden />
            {t('previous')}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground">{t('status', { page, pages })}</p>
      {page < pages ? (
        <Button asChild variant="outline">
          <Link href={{ pathname, query: toQuery(params, { page: page + 1 }) }} rel="next">
            {t('next')}
            <ArrowRightIcon className="rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}

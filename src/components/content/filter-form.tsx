import { getLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { localizedText } from '@/lib/content/localized';
import type { ListParams } from '@/lib/content/params';
import type { Json } from '@/types/database';

const selectClass =
  'h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm';
const labelClass = 'text-sm font-semibold';

/**
 * Filters for a public list. A plain GET form: works without JavaScript, and every filtered view has
 * a shareable URL. Page resets to 1 on every submit.
 */
export async function FilterForm({
  pathname,
  params,
  genres,
  governorates,
  dates = false,
  when = false,
}: {
  pathname: string;
  params: ListParams;
  genres?: { slug: string; name: Json }[];
  governorates: { code: string; name: Json }[];
  dates?: boolean;
  when?: boolean;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('content.filters');
  const action = getPathname({ href: pathname, locale });

  return (
    <form
      action={action}
      method="get"
      role="search"
      aria-label={t('label')}
      className="grid gap-4 rounded-2xl border-2 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-q" className={labelClass}>
          {t('search')}
        </label>
        <Input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={params.q ?? ''}
          placeholder={t('searchPlaceholder')}
          maxLength={100}
        />
      </div>
      {when ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-when" className={labelClass}>
            {t('when')}
          </label>
          <select
            id="filter-when"
            name="when"
            defaultValue={params.when ?? 'upcoming'}
            className={selectClass}
          >
            <option value="upcoming">{t('upcoming')}</option>
            <option value="past">{t('past')}</option>
          </select>
        </div>
      ) : null}
      {genres ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="filter-genre" className={labelClass}>
            {t('genre')}
          </label>
          <select
            id="filter-genre"
            name="genre"
            defaultValue={params.genre ?? ''}
            className={selectClass}
          >
            <option value="">{t('all')}</option>
            {genres.map((genre) => (
              <option key={genre.slug} value={genre.slug}>
                {localizedText(genre.name, locale)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-governorate" className={labelClass}>
          {t('governorate')}
        </label>
        <select
          id="filter-governorate"
          name="governorate"
          defaultValue={params.governorate ?? ''}
          className={selectClass}
        >
          <option value="">{t('all')}</option>
          {governorates.map((governorate) => (
            <option key={governorate.code} value={governorate.code}>
              {localizedText(governorate.name, locale)}
            </option>
          ))}
        </select>
      </div>
      {dates ? (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="filter-from" className={labelClass}>
              {t('from')}
            </label>
            <Input id="filter-from" name="from" type="date" defaultValue={params.from ?? ''} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="filter-to" className={labelClass}>
              {t('to')}
            </label>
            <Input id="filter-to" name="to" type="date" defaultValue={params.to ?? ''} />
          </div>
        </>
      ) : null}
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <Button type="submit">{t('apply')}</Button>
        <Button asChild variant="link">
          <a href={action}>{t('reset')}</a>
        </Button>
      </div>
    </form>
  );
}

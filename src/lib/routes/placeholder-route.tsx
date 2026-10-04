import type { Metadata } from 'next';
import type { Messages } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { PlaceholderPage } from '@/components/layout/placeholder-page';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

type PageKey = keyof Messages['pages'];
type Props = { params: Promise<{ locale: string }> };

/**
 * Page + metadata for a route whose content arrives in a later phase. Copy comes from
 * `pages.<key>` in messages/*.json. Usage in a page file:
 *   const route = placeholderRoute('news', '/news');
 *   export const generateMetadata = route.generateMetadata;
 *   export default route.Page;
 */
export function placeholderRoute(page: PageKey, path: string, { noindex = false } = {}) {
  async function copy(params: Props['params']) {
    const locale = await resolveLocaleParam(params);
    const t = await getTranslations({ locale, namespace: `pages.${page}` });
    return { locale, title: t('title'), description: t('description') };
  }

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, title, description } = await copy(params);
    return pageMetadata({ locale, path, title, description, noindex });
  }

  async function Page({ params }: Props) {
    const { title, description } = await copy(params);
    return <PlaceholderPage title={title} description={description} />;
  }

  return { generateMetadata, Page };
}

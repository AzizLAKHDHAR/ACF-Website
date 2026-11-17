import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { areaSectionHref, type Area, type AreaSection } from '@/config/navigation';
import type { Locale } from '@/i18n/routing';
import { localizedPath } from '@/lib/metadata';

/**
 * Metadata of a page in a hidden area: the section's title and description from `areas.*`, or a
 * page-specific title (a meeting's, a poll's). The layouts already mark the areas `noindex`.
 */
export async function areaMetadata<A extends Area>(
  locale: Locale,
  area: A,
  section: AreaSection<A>,
  { title, path }: { title?: string; path?: string } = {},
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'areas' });
  // Keys exist for every configured section; src/config/navigation.test.ts enforces it.
  const key = `${area}.sections.${section}` as 'member.sections.dashboard';
  return {
    title: title || t(`${key}.title`),
    description: t(`${key}.description`),
    alternates: { canonical: localizedPath(locale, path ?? areaSectionHref(area, section)) },
  };
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PlaceholderPage } from '@/components/layout/placeholder-page';
import { areaSections, type Area, type AreaSection } from '@/config/navigation';
import type { Locale } from '@/i18n/routing';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { localizedPath } from '@/lib/metadata';

type IndexProps = { params: Promise<{ locale: string }> };
type SectionProps = { params: Promise<{ locale: string; section: string }> };

/**
 * Placeholder pages for a hidden area (member, board, admin). The layout of each area guards
 * access; these only render once the guard lets a request through (never in phase 1 production).
 */
export function areaRoute<A extends Area>(area: A) {
  const sections = areaSections[area] as readonly AreaSection<A>[];
  const [indexSection] = sections;

  function toSection(value: string): AreaSection<A> {
    const match = sections.find((section) => section === value);
    if (!match || match === indexSection) notFound();
    return match;
  }

  async function copy(locale: Locale, section: AreaSection<A>) {
    const t = await getTranslations({ locale, namespace: 'areas' });
    // Keys exist for every configured section; src/config/navigation.test.ts enforces it.
    const key = `${area}.sections.${section}` as `member.sections.dashboard`;
    return { title: t(`${key}.title`), description: t(`${key}.description`) };
  }

  async function metadataFor(locale: Locale, section: AreaSection<A>): Promise<Metadata> {
    const { title, description } = await copy(locale, section);
    const path = section === indexSection ? `/${area}` : `/${area}/${section}`;
    return { title, description, alternates: { canonical: localizedPath(locale, path) } };
  }

  return {
    async generateIndexMetadata({ params }: IndexProps) {
      const locale = await resolveLocaleParam(params);
      return metadataFor(locale, indexSection as AreaSection<A>);
    },
    async IndexPage({ params }: IndexProps) {
      const locale = await resolveLocaleParam(params);
      const { title, description } = await copy(locale, indexSection as AreaSection<A>);
      return <PlaceholderPage title={title} description={description} />;
    },
    async generateSectionMetadata({ params }: SectionProps) {
      const locale = await resolveLocaleParam(params);
      return metadataFor(locale, toSection((await params).section));
    },
    async SectionPage({ params }: SectionProps) {
      const locale = await resolveLocaleParam(params);
      const { title, description } = await copy(locale, toSection((await params).section));
      return <PlaceholderPage title={title} description={description} />;
    },
  };
}

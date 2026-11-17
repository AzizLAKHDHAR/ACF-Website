/**
 * Single source of truth for the shell's navigation. Labels are message keys, never literals.
 * Routes follow docs/architecture.md §4.
 */

export const catalogueSections = ['artists', 'professionals', 'venues', 'studios'] as const;
export type CatalogueSection = (typeof catalogueSections)[number];

export const publicSections = ['news', 'events', ...catalogueSections, 'blogs'] as const;
export type PublicSection = (typeof publicSections)[number];

export const infoPages = ['about', 'contact'] as const;
export const legalPages = ['privacy', 'terms'] as const;

export type PublicPage = PublicSection | (typeof infoPages)[number] | (typeof legalPages)[number];

export const publicHref: Record<PublicPage, string> = {
  news: '/news',
  events: '/events',
  artists: '/artists',
  professionals: '/professionals',
  venues: '/venues',
  studios: '/studios',
  blogs: '/blogs',
  about: '/about',
  contact: '/contact',
  privacy: '/legal/privacy',
  terms: '/legal/terms',
};

/** Header order: News · Events · Discover ▾ (catalogues) · Blogs · About. */
export const headerLinks = ['news', 'events'] as const;
export const headerLinksAfterDiscover = ['blogs', 'about'] as const;

/** Hidden areas and their sections. The first section of each area is its index route. */
export const areaSections = {
  member: [
    'dashboard',
    'meetings',
    'tasks',
    'announcements',
    'polls',
    'volunteer',
    'documents',
    'directory',
  ],
  board: [
    'overview',
    'tasks',
    'meetings',
    'announcements',
    'polls',
    'volunteering',
    'news',
    'events',
    'finance',
    'vault',
    'correspondence',
  ],
  admin: ['overview', 'users', 'approvals', 'moderation', 'audit', 'settings', 'integrations'],
} as const;

export type Area = keyof typeof areaSections;
export type AreaSection<A extends Area> = (typeof areaSections)[A][number];

export function areaSectionHref<A extends Area>(area: A, section: AreaSection<A>): string {
  return section === areaSections[area][0] ? `/${area}` : `/${area}/${section}`;
}

/** Sub-sections (everything but the index) — used to pre-render the `[section]` placeholders. */
export function areaSubSections<A extends Area>(area: A): AreaSection<A>[] {
  return areaSections[area].slice(1) as AreaSection<A>[];
}

/** Sections with their own route folder; the `[section]` placeholder must not pre-render them. */
export const implementedSections: { [A in Area]: readonly AreaSection<A>[] } = {
  member: ['meetings', 'tasks', 'announcements', 'polls', 'volunteer', 'documents', 'directory'],
  board: ['meetings', 'announcements', 'polls', 'volunteering', 'events'],
  admin: ['approvals'],
};

/** Whether `pathname` is a section's page or one of its detail pages (the index matches only itself). */
export function isSectionActive<A extends Area>(
  area: A,
  section: AreaSection<A>,
  pathname: string,
): boolean {
  const href = areaSectionHref(area, section);
  return pathname === href || (href !== `/${area}` && pathname.startsWith(`${href}/`));
}

/** Sub-sections still served by the `[section]` placeholder page. */
export function placeholderSections<A extends Area>(area: A): AreaSection<A>[] {
  const implemented = implementedSections[area] as readonly AreaSection<A>[];
  return areaSubSections(area).filter((section) => !implemented.includes(section));
}

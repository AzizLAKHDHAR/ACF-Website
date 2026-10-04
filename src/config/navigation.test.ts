import { describe, expect, it } from 'vitest';
import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { areaSectionIcons, publicSectionIcons } from './icons';
import {
  areaSectionHref,
  areaSections,
  areaSubSections,
  infoPages,
  legalPages,
  publicHref,
  publicSections,
  type Area,
} from './navigation';

const catalogs = { ar, fr, en };

describe('navigation config ↔ messages', () => {
  it.each(Object.entries(catalogs))(
    '%s has a label and page copy for every public page',
    (_, m) => {
      for (const key of [...publicSections, ...infoPages, ...legalPages]) {
        expect(m.nav[key], `nav.${key}`).toBeTruthy();
        expect(m.pages[key].title, `pages.${key}.title`).toBeTruthy();
        expect(m.pages[key].description, `pages.${key}.description`).toBeTruthy();
      }
    },
  );

  it.each(Object.entries(catalogs))('%s has copy for every hidden-area section', (_, m) => {
    for (const area of Object.keys(areaSections) as Area[]) {
      const sections = m.areas[area].sections as Record<
        string,
        { title: string; description: string }
      >;
      expect(m.areas[area].name).toBeTruthy();
      for (const section of areaSections[area]) {
        expect(sections[section]?.title, `${area}.${section}.title`).toBeTruthy();
        expect(sections[section]?.description, `${area}.${section}.description`).toBeTruthy();
      }
    }
  });

  it('has an icon for every section', () => {
    for (const key of publicSections) expect(publicSectionIcons[key]).toBeDefined();
    for (const area of Object.keys(areaSections) as Area[]) {
      const icons = areaSectionIcons[area] as Record<string, unknown>;
      for (const section of areaSections[area])
        expect(icons[section], `${area}.${section}`).toBeDefined();
    }
  });
});

describe('hrefs', () => {
  it('uses unique, absolute, locale-less public paths', () => {
    const hrefs = Object.values(publicHref);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) expect(href).toMatch(/^\/[a-z/-]+$/);
  });

  it('maps the first section of an area to its index route', () => {
    expect(areaSectionHref('member', 'dashboard')).toBe('/member');
    expect(areaSectionHref('member', 'tasks')).toBe('/member/tasks');
    expect(areaSectionHref('admin', 'overview')).toBe('/admin');
    expect(areaSubSections('board')).not.toContain('overview');
    expect(areaSubSections('board')).toHaveLength(areaSections.board.length - 1);
  });
});

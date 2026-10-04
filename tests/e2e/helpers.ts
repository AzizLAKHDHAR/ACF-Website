import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

export const locales = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const messages = { ar, fr, en } as const;

export const publicPaths = [
  { key: 'news', path: '/news' },
  { key: 'events', path: '/events' },
  { key: 'artists', path: '/artists' },
  { key: 'professionals', path: '/professionals' },
  { key: 'venues', path: '/venues' },
  { key: 'studios', path: '/studios' },
  { key: 'blogs', path: '/blogs' },
  { key: 'about', path: '/about' },
  { key: 'contact', path: '/contact' },
  { key: 'privacy', path: '/legal/privacy' },
  { key: 'terms', path: '/legal/terms' },
] as const;

export const hiddenPaths = [
  '/account',
  '/member',
  '/member/tasks',
  '/board',
  '/board/finance',
  '/admin',
  '/admin/users',
] as const;

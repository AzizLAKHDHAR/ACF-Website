import { intlLocale } from '@/i18n/locale';
import type { Locale } from '@/i18n/routing';

export const TIME_ZONE = 'Africa/Tunis';

/** "samedi 25 octobre 2026" / "السبت 25 أكتوبر 2026" / "Saturday, October 25, 2026", in Tunis time. */
export function formatDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'full',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** Date and time, e.g. for event start times. */
export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** Short date for lists and cards. */
export function formatShortDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'medium',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** Midnight today in Tunis, as an ISO instant: the boundary between upcoming and past events. */
export function startOfTodayInTunis(now: Date = new Date()): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now); // YYYY-MM-DD
  return tunisDayStart(day);
}

/** Start of a calendar day (YYYY-MM-DD) in Tunis, as an ISO instant. Tunisia is UTC+1 with no DST. */
export function tunisDayStart(day: string): string {
  return new Date(`${day}T00:00:00+01:00`).toISOString();
}

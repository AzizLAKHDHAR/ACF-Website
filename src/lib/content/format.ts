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

/** A start and optional end, as one range ("12 Nov 2026, 18:00 – 20:00" on a single day), in Tunis time. */
export function formatDateTimeRange(
  start: string | Date,
  end: string | Date | null | undefined,
  locale: Locale,
): string {
  const format = new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  });
  return end ? format.formatRange(new Date(start), new Date(end)) : format.format(new Date(start));
}

/** A count, in the locale's digits (ar-TN keeps Latin digits, like Tunisian usage). */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(value);
}

/** Short date for lists and cards. */
export function formatShortDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: 'medium',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** Today's calendar day in Tunis (YYYY-MM-DD), to compare with `date` columns such as due dates. */
export function todayInTunis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
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

/**
 * A `datetime-local` value (YYYY-MM-DDTHH:mm), read as Tunis wall-clock time, as an ISO instant;
 * null when it isn't a valid date. Tunisia is UTC+1 all year (no DST).
 */
export function tunisLocalToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+01:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

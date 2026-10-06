import type { Json } from '@/types/database';
import type { Locale } from '@/i18n/routing';
import { getDirection } from '@/i18n/locale';
import { localized } from '@/lib/content/localized';

/**
 * A translatable DB field in the best available language. When it falls back to another language,
 * it carries that language's `lang` and `dir` so screen readers and bidi layout stay right.
 */
export function LocalizedText({
  value,
  locale,
  as: Tag = 'span',
  className,
}: {
  value: Json | null | undefined;
  locale: Locale;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const text = localized(value, locale);
  if (!text) return null;
  const foreign = text.locale !== locale;
  return (
    <Tag
      className={className}
      lang={foreign ? text.locale : undefined}
      dir={foreign ? getDirection(text.locale) : undefined}
    >
      {text.text}
    </Tag>
  );
}

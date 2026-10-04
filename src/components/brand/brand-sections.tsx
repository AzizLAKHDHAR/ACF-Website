import { useId, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { CAMO_TILE_PATH, CAMO_TILE_SIZE } from './camo-tile';

const genres = ['rock', 'jazz', 'metal', 'funk', 'more'] as const;
const values = ['inclusive', 'safe', 'fair', 'autonomous', 'decentralized'] as const;
const axes = [
  { key: 'financial', swatch: 'bg-brand' },
  { key: 'artistic', swatch: 'bg-secondary' },
  { key: 'educational', swatch: 'bg-background' },
] as const;
const educationalItems = [
  'aid',
  'mentoring',
  'interviews',
  'films',
  'signature',
  'blog',
  'coverage',
  'easterEgg',
] as const;

/** The charter's pixel-camo motif, tinted with the `camo` token. Decorative only. */
export function CamoBackground({ className }: { className?: string }) {
  const patternId = useId();
  return (
    <svg
      aria-hidden
      focusable="false"
      className={cn('pointer-events-none absolute inset-0 size-full text-camo', className)}
    >
      <defs>
        <pattern
          id={patternId}
          width={CAMO_TILE_SIZE}
          height={CAMO_TILE_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <path d={CAMO_TILE_PATH} fill="currentColor" shapeRendering="crispEdges" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/** "Rock · Jazz · Metal · Funk · & more" chips on the camo motif. */
export function GenreStrip() {
  const t = useTranslations('brand');
  return (
    <ul aria-label={t('genresLabel')} className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <li
          key={genre}
          className="rounded-full bg-secondary px-4 py-1.5 text-base font-bold text-secondary-foreground sm:text-lg"
        >
          {t(`genres.${genre}`)}
        </li>
      ))}
    </ul>
  );
}

/** "What we stand for": the five commitments, with the charter's green check squares. */
export function ValuesList({ headingLevel: Heading = 'h2' }: { headingLevel?: 'h2' | 'h3' }) {
  const t = useTranslations('brand');
  return (
    <section aria-labelledby="values-title" className="flex flex-col gap-6">
      <Heading id="values-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t('valuesTitle')}
      </Heading>
      <ul className="flex flex-col gap-4">
        {values.map((value) => (
          <li key={value} className="flex items-start gap-3 text-lg">
            <span
              aria-hidden
              className="mt-1.5 size-4 shrink-0 rounded-[3px] border-2 border-primary-border bg-brand"
            />
            <p>
              <strong className="font-bold">{t(`values.${value}.title`)}</strong>{' '}
              <span className="text-muted-foreground">{t(`values.${value}.body`)}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Three axes of action": financial (green), artistic (ink), educational (white). */
export function AxesSection() {
  const t = useTranslations('brand');
  return (
    <section aria-labelledby="axes-title" className="flex flex-col gap-8">
      <h2 id="axes-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t('axesTitle')}
      </h2>
      <ol className="flex flex-col gap-8">
        {axes.map(({ key, swatch }) => (
          <li key={key} className="flex items-start gap-5">
            <span
              aria-hidden
              className={cn('size-14 shrink-0 rounded-full border-2 border-foreground', swatch)}
            />
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">{t(`axes.${key}.title`)}</h3>
              <p className="text-lg text-muted-foreground">{t(`axes.${key}.body`)}</p>
              {key === 'educational' ? (
                <ul className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {educationalItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span aria-hidden className="mt-2 size-2.5 shrink-0 bg-foreground" />
                      {t(`educationalItems.${item}`)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "Our members": individuals (green card) and university clubs (ink card). */
export function MembersSection() {
  const t = useTranslations('brand');
  return (
    <section aria-labelledby="members-title" className="flex flex-col gap-6">
      <h2 id="members-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t('membersTitle')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-brand p-6 text-brand-foreground">
          <h3 className="text-xl font-bold">{t('members.individual.title')}</h3>
          <p className="mt-2">{t('members.individual.body')}</p>
        </div>
        <div className="rounded-2xl bg-secondary p-6 text-secondary-foreground">
          <h3 className="text-xl font-bold">{t('members.clubs.title')}</h3>
          <p className="mt-2">{t('members.clubs.body')}</p>
        </div>
      </div>
    </section>
  );
}

/** Ink "Join us" banner. Contact channels are added once ACF provides them. */
export function JoinBanner({ children }: { children?: ReactNode }) {
  const t = useTranslations('brand');
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-secondary p-6 text-secondary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <h2 className="text-2xl font-extrabold text-brand dark:text-secondary-foreground">
        {t('joinTitle')}
      </h2>
      {children}
    </section>
  );
}

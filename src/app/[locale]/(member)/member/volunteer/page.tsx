import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Pill } from '@/components/content/pill';
import { ActionForm } from '@/components/forms/action-form';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { cancelShiftSignup, signUpForShift } from '@/features/volunteering/actions';
import { listUpcomingShifts } from '@/features/volunteering/queries';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guards';
import { formatDateTime, formatDateTimeRange, formatNumber } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member/volunteer'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'volunteer');
}

type Shift = Awaited<ReturnType<typeof listUpcomingShifts>>[number];

/** Upcoming volunteer shifts by event: places left, and signing up or giving the place back. */
export default async function VolunteerPage({ params }: PageProps<'/[locale]/member/volunteer'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('member', { returnTo: '/member/volunteer' });
  const t = await getTranslations({ locale });
  const shifts = await listUpcomingShifts();

  // Group by event, in the order of the first shift of each.
  const groups = new Map<string, { event: Shift['event']; shifts: Shift[] }>();
  for (const shift of shifts) {
    const key = shift.event_id ?? 'none';
    const group = groups.get(key) ?? { event: shift.event, shifts: [] };
    group.shifts.push(shift);
    groups.set(key, group);
  }

  return (
    <AreaPage
      title={t('areas.member.sections.volunteer.title')}
      description={t('areas.member.sections.volunteer.description')}
    >
      {shifts.length === 0 ? (
        <EmptyState>{t('memberSpace.volunteer.empty')}</EmptyState>
      ) : (
        [...groups.entries()].map(([key, group]) => {
          const title = group.event
            ? localizedText(group.event.title, locale)
            : t('memberSpace.volunteer.noEvent');
          return (
            <AreaSection
              key={key}
              id={`event-${key}`}
              title={
                group.event ? (
                  <Link
                    href={`/events/${group.event.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    <span dir="auto">{title}</span>
                  </Link>
                ) : (
                  title
                )
              }
              description={group.event ? formatDateTime(group.event.starts_at, locale) : undefined}
            >
              <ul className="grid gap-4 sm:grid-cols-2">
                {group.shifts.map((shift) => {
                  const full = shift.taken >= shift.capacity;
                  const role = localizedText(shift.role_label, locale);
                  return (
                    <li key={shift.shift_id}>
                      <article
                        aria-labelledby={`shift-${shift.shift_id}`}
                        className="flex h-full flex-col gap-3 rounded-2xl border-2 p-5"
                        data-testid="shift"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {shift.signed_up ? (
                            <Pill tone="primary">{t('memberSpace.volunteer.youreIn')}</Pill>
                          ) : null}
                          {full && !shift.signed_up ? (
                            <Pill tone="danger">{t('memberSpace.volunteer.full')}</Pill>
                          ) : null}
                        </div>
                        <h3 id={`shift-${shift.shift_id}`} className="text-lg font-bold" dir="auto">
                          {role}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          <time dateTime={shift.starts_at}>
                            {formatDateTimeRange(shift.starts_at, shift.ends_at, locale)}
                          </time>
                        </p>
                        <p className="text-sm font-semibold" data-testid="shift-places">
                          {t('memberSpace.volunteer.places', {
                            taken: formatNumber(shift.taken, locale),
                            capacity: formatNumber(shift.capacity, locale),
                          })}
                        </p>
                        <div className="mt-auto">
                          {shift.signed_up ? (
                            <ActionForm
                              action={cancelShiftSignup}
                              hidden={{ shiftId: shift.shift_id }}
                              submitLabel={t('memberSpace.volunteer.cancel')}
                              submitVariant="outline"
                            />
                          ) : full ? null : (
                            <ActionForm
                              action={signUpForShift}
                              hidden={{ shiftId: shift.shift_id }}
                              submitLabel={t('memberSpace.volunteer.signUp')}
                            />
                          )}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </AreaSection>
          );
        })
      )}
    </AreaPage>
  );
}

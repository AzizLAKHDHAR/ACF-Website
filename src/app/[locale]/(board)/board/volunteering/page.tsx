import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextField } from '@/components/forms/fields';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { createShift, deleteShift, removeSignup } from '@/features/volunteering/actions';
import {
  listSignups,
  listUpcomingEvents,
  listUpcomingShifts,
} from '@/features/volunteering/queries';
import { MAX_SHIFT_CAPACITY } from '@/features/volunteering/schemas';
import { routing } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/guards';
import { formatDateTime, formatDateTimeRange, formatNumber } from '@/lib/content/format';
import { localizedText } from '@/lib/content/localized';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/board/volunteering'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'board', 'volunteering');
}

/** The board opens volunteer shifts for events and sees (and can remove) who signed up. */
export default async function BoardVolunteeringPage({
  params,
}: PageProps<'/[locale]/board/volunteering'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('board', { returnTo: '/board/volunteering' });
  const t = await getTranslations({ locale });
  const [shifts, events] = await Promise.all([listUpcomingShifts(), listUpcomingEvents()]);
  const signups = await listSignups(shifts.map((shift) => shift.shift_id));

  return (
    <AreaPage
      title={t('areas.board.sections.volunteering.title')}
      description={t('areas.board.sections.volunteering.description')}
    >
      <AreaSection id="new-shift" title={t('memberSpace.board.volunteering.new')}>
        <ActionForm
          action={createShift}
          submitLabel={t('memberSpace.board.volunteering.create')}
          resetOnSuccess
          className="rounded-2xl border-2 p-6"
          testId="shift-form"
        >
          <SelectField
            name="eventId"
            label={t('memberSpace.board.volunteering.event')}
            placeholder={t('memberSpace.board.volunteering.noEvent')}
            options={events.map((event) => ({
              value: event.id,
              label: t('memberSpace.board.volunteering.eventOption', {
                title: localizedText(event.title, locale),
                date: formatDateTime(event.starts_at, locale),
              }),
            }))}
          />
          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold">
              {t('memberSpace.board.volunteering.role')}
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {routing.locales.map((language) => (
                <TextField
                  key={language}
                  name={`role_${language}`}
                  label={t('memberSpace.board.volunteering.roleIn', {
                    language: t(`localeNames.${language}`),
                  })}
                  maxLength={120}
                  lang={language}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
              ))}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField
              name="startsAt"
              type="datetime-local"
              label={t('memberSpace.board.fields.startsAt')}
              hint={t('memberSpace.board.fields.tunisTime')}
              required
            />
            <TextField
              name="endsAt"
              type="datetime-local"
              label={t('memberSpace.board.fields.endsAt')}
              required
            />
            <TextField
              name="capacity"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_SHIFT_CAPACITY}
              label={t('memberSpace.board.volunteering.capacity')}
              required
            />
          </div>
        </ActionForm>
      </AreaSection>

      <AreaSection id="shifts" title={t('memberSpace.board.volunteering.upcoming')}>
        {shifts.length === 0 ? (
          <EmptyState>{t('memberSpace.volunteer.empty')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {shifts.map((shift) => {
              const people = signups.filter((signup) => signup.shift_id === shift.shift_id);
              return (
                <li key={shift.shift_id}>
                  <article
                    aria-labelledby={`shift-${shift.shift_id}`}
                    className="flex flex-col gap-3 rounded-2xl border-2 p-5"
                    data-testid="board-shift"
                  >
                    <h3 id={`shift-${shift.shift_id}`} className="text-lg font-bold" dir="auto">
                      {localizedText(shift.role_label, locale)}
                    </h3>
                    <p className="flex flex-col text-sm text-muted-foreground">
                      {shift.event ? (
                        <span dir="auto">{localizedText(shift.event.title, locale)}</span>
                      ) : null}
                      <time dateTime={shift.starts_at}>
                        {formatDateTimeRange(shift.starts_at, shift.ends_at, locale)}
                      </time>
                    </p>
                    <p className="text-sm font-semibold">
                      {t('memberSpace.volunteer.places', {
                        taken: formatNumber(shift.taken, locale),
                        capacity: formatNumber(shift.capacity, locale),
                      })}
                    </p>
                    {people.length > 0 ? (
                      <ul
                        className="flex flex-col gap-2"
                        aria-label={t('memberSpace.board.volunteering.signedUp')}
                      >
                        {people.map((signup) => (
                          <li key={signup.id} className="flex flex-wrap items-center gap-3">
                            <span className="font-semibold">
                              <bdi>
                                {signup.account?.display_name ?? t('memberSpace.formerMember')}
                              </bdi>
                            </span>
                            <ActionForm
                              action={removeSignup}
                              hidden={{ signupId: signup.id }}
                              submitLabel={t('memberSpace.board.volunteering.remove')}
                              submitVariant="outline"
                              confirmMessage={t('memberSpace.board.volunteering.removeConfirm')}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('memberSpace.board.volunteering.nobody')}
                      </p>
                    )}
                    <div className="border-t pt-4">
                      <ActionForm
                        action={deleteShift}
                        hidden={{ shiftId: shift.shift_id }}
                        submitLabel={t('memberSpace.board.delete')}
                        submitVariant="outline"
                        confirmMessage={t('memberSpace.board.volunteering.deleteConfirm')}
                      />
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </AreaSection>
    </AreaPage>
  );
}

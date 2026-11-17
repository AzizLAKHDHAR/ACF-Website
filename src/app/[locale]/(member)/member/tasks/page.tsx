import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { ActionForm } from '@/components/forms/action-form';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { takeTask } from '@/features/tasks/actions';
import { TaskCard } from '@/features/tasks/components/task-card';
import { listTasks } from '@/features/tasks/queries';
import { requireRole } from '@/lib/auth/guards';
import { todayInTunis } from '@/lib/content/format';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member/tasks'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'tasks');
}

/** The member's tasks, the open tasks anyone may take, and the other active tasks for context. */
export default async function TasksPage({ params }: PageProps<'/[locale]/member/tasks'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireRole('member', { returnTo: '/member/tasks' });
  const t = await getTranslations({ locale });
  const { mine, open, others } = await listTasks(user.id);
  const today = todayInTunis();

  return (
    <AreaPage
      title={t('areas.member.sections.tasks.title')}
      description={t('areas.member.sections.tasks.description')}
    >
      <AreaSection id="my-tasks" title={t('memberSpace.tasks.mine')}>
        {mine.length === 0 ? (
          <EmptyState>{t('memberSpace.tasks.emptyMine')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {mine.map((task) => (
              <li key={task.id}>
                <TaskCard task={task} locale={locale} today={today} />
              </li>
            ))}
          </ul>
        )}
      </AreaSection>
      <AreaSection
        id="open-tasks"
        title={t('memberSpace.tasks.open')}
        description={t('memberSpace.tasks.openHint')}
      >
        {open.length === 0 ? (
          <EmptyState>{t('memberSpace.tasks.emptyOpen')}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {open.map((task) => (
              <li key={task.id}>
                <TaskCard task={task} locale={locale} today={today}>
                  <ActionForm
                    action={takeTask}
                    hidden={{ taskId: task.id }}
                    submitLabel={t('memberSpace.tasks.take')}
                    submitVariant="outline"
                  />
                </TaskCard>
              </li>
            ))}
          </ul>
        )}
      </AreaSection>
      {others.length > 0 ? (
        <AreaSection id="other-tasks" title={t('memberSpace.tasks.others')}>
          <ul className="flex flex-col gap-4">
            {others.map((task) => (
              <li key={task.id}>
                <TaskCard task={task} locale={locale} today={today} />
              </li>
            ))}
          </ul>
        </AreaSection>
      ) : null}
    </AreaPage>
  );
}

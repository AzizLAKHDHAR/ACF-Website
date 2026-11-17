import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Markdown } from '@/components/content/markdown';
import { ActionForm } from '@/components/forms/action-form';
import { SelectField, TextAreaField } from '@/components/forms/fields';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import {
  addTaskComment,
  changeTaskStatus,
  deleteTaskComment,
  leaveTask,
  takeTask,
} from '@/features/tasks/actions';
import { TaskPills } from '@/features/tasks/components/task-card';
import { getTask } from '@/features/tasks/queries';
import { assigneeStatuses } from '@/features/tasks/schemas';
import { getSessionRole, requireRole } from '@/lib/auth/guards';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { formatDateTime, formatShortDate, todayInTunis } from '@/lib/content/format';
import { id as idSchema } from '@/lib/forms/schemas';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

type Props = PageProps<'/[locale]/member/tasks/[id]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const task = idSchema.safeParse(id).success ? await getTask(id) : null;
  return areaMetadata(locale, 'member', 'tasks', {
    title: task?.title,
    path: `/member/tasks/${id}`,
  });
}

/** One task: what it is, who's on it, its status (assignees change it) and the comment thread. */
export default async function TaskPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const user = await requireRole('member', { returnTo: '/member/tasks' });
  if (!idSchema.safeParse(id).success) notFound();
  const task = await getTask(id);
  if (!task) notFound();
  const t = await getTranslations({ locale });
  const isBoard = hasRoleAtLeast(await getSessionRole(), 'board');
  const mine = task.task_assignees.find((assignee) => assignee.user_id === user.id);
  const active = task.status !== 'done' && task.status !== 'cancelled';
  const canTake = !mine && task.is_open && active;
  const assignees = task.task_assignees
    .map((assignee) => assignee.account?.display_name)
    .filter(Boolean)
    .join(', ');

  return (
    <AreaPage
      title={task.title}
      titleDir="auto"
      back={{ href: '/member/tasks', label: t('memberSpace.tasks.back') }}
      description={<TaskPills task={task} today={todayInTunis()} />}
    >
      <dl className="grid gap-4 rounded-2xl border-2 p-6 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('memberSpace.tasks.due')}</dt>
          <dd className="font-semibold">
            {task.due_on ? (
              <time dateTime={task.due_on}>{formatShortDate(task.due_on, locale)}</time>
            ) : (
              t('memberSpace.tasks.noDueDate')
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('memberSpace.tasks.project')}</dt>
          <dd className="font-semibold" dir="auto">
            {task.project?.name ?? '—'}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{t('memberSpace.tasks.assignees')}</dt>
          <dd className="font-semibold" data-testid="task-assignees">
            {assignees ? <bdi>{assignees}</bdi> : t('memberSpace.tasks.nobody')}
          </dd>
        </div>
      </dl>

      {task.description_md ? <Markdown>{task.description_md}</Markdown> : null}

      {mine || canTake ? (
        <AreaSection id="task-actions" title={t('memberSpace.tasks.yourPart')}>
          {mine ? (
            <div className="flex flex-col gap-6 rounded-2xl border-2 p-6">
              <ActionForm
                action={changeTaskStatus}
                hidden={{ taskId: task.id }}
                submitLabel={t('memberSpace.tasks.saveStatus')}
                testId="task-status-form"
              >
                <SelectField
                  name="status"
                  label={t('memberSpace.tasks.statusLabel')}
                  defaultValue={task.status === 'cancelled' ? 'todo' : task.status}
                  options={assigneeStatuses.map((status) => ({
                    value: status,
                    label: t(`memberSpace.tasks.status.${status}`),
                  }))}
                />
              </ActionForm>
              {mine.assigned_by === user.id ? (
                <ActionForm
                  action={leaveTask}
                  hidden={{ taskId: task.id }}
                  submitLabel={t('memberSpace.tasks.leave')}
                  submitVariant="outline"
                  className="border-t pt-6"
                />
              ) : null}
            </div>
          ) : (
            <ActionForm
              action={takeTask}
              hidden={{ taskId: task.id }}
              submitLabel={t('memberSpace.tasks.take')}
              className="rounded-2xl border-2 p-6"
            >
              <p className="text-sm text-muted-foreground">{t('memberSpace.tasks.takeHint')}</p>
            </ActionForm>
          )}
        </AreaSection>
      ) : null}

      <AreaSection id="comments" title={t('memberSpace.tasks.comments')}>
        {task.task_comments.length === 0 ? (
          <EmptyState>{t('memberSpace.tasks.noComments')}</EmptyState>
        ) : (
          <ol className="flex flex-col gap-4">
            {task.task_comments.map((comment) => (
              <li key={comment.id}>
                <article
                  aria-labelledby={`comment-${comment.id}`}
                  className="flex flex-col gap-2 rounded-2xl border-2 p-5"
                  data-testid="task-comment"
                >
                  <header
                    id={`comment-${comment.id}`}
                    className="flex flex-wrap items-baseline gap-x-3 text-sm"
                  >
                    <span className="font-semibold">
                      <bdi>{comment.author?.display_name ?? t('memberSpace.formerMember')}</bdi>
                    </span>
                    <time dateTime={comment.created_at} className="text-muted-foreground">
                      {formatDateTime(comment.created_at, locale)}
                    </time>
                  </header>
                  <p className="whitespace-pre-line" dir="auto">
                    {comment.body_md}
                  </p>
                  {comment.author_id === user.id || isBoard ? (
                    <ActionForm
                      action={deleteTaskComment}
                      hidden={{ taskId: task.id, commentId: comment.id }}
                      submitLabel={t('memberSpace.tasks.deleteComment')}
                      submitVariant="outline"
                      confirmMessage={t('memberSpace.tasks.deleteCommentConfirm')}
                    />
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
        )}
        <ActionForm
          action={addTaskComment}
          hidden={{ taskId: task.id }}
          submitLabel={t('memberSpace.tasks.addComment')}
          resetOnSuccess
          className="rounded-2xl border-2 p-6"
          testId="comment-form"
        >
          <TextAreaField
            id="comment-body"
            name="body"
            label={t('memberSpace.tasks.commentLabel')}
            rows={3}
            maxLength={5000}
            required
            dir="auto"
          />
        </ActionForm>
      </AreaSection>
    </AreaPage>
  );
}

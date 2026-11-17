import type * as React from 'react';
import { useTranslations } from 'next-intl';
import { Pill } from '@/components/content/pill';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatShortDate } from '@/lib/content/format';
import type { TaskStatus } from '../schemas';
import { isOverdue } from '../status';

export type TaskSummary = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  due_on: string | null;
  is_open: boolean;
  audience: string;
  project: { name: string } | null;
  task_assignees: { user_id: string; account: { display_name: string } | null }[];
};

/** The status, priority and audience words shown on a task. */
export function TaskPills({ task, today }: { task: TaskSummary; today: string }) {
  const t = useTranslations('memberSpace.tasks');
  const tAudience = useTranslations('memberSpace.audience');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill tone={task.status === 'done' ? 'primary' : 'strong'} testId="task-status">
        {t(`status.${task.status}`)}
      </Pill>
      {task.priority === 1 ? <Pill tone="danger">{t('priorityHigh')}</Pill> : null}
      {isOverdue(task, today) ? <Pill tone="danger">{t('overdue')}</Pill> : null}
      {task.is_open && task.status !== 'done' ? <Pill>{t('openToVolunteers')}</Pill> : null}
      {task.audience === 'board' ? <Pill tone="strong">{tAudience('boardOnly')}</Pill> : null}
    </div>
  );
}

export function TaskCard({
  task,
  locale,
  today,
  children,
}: {
  task: TaskSummary;
  locale: Locale;
  /** Today's date in Tunis (YYYY-MM-DD), for the overdue badge. */
  today: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations('memberSpace.tasks');
  const assignees = task.task_assignees
    .map((assignee) => assignee.account?.display_name)
    .filter(Boolean)
    .join(', ');
  return (
    <article
      aria-labelledby={`task-${task.id}`}
      className="flex flex-col gap-3 rounded-2xl border-2 p-5"
      data-testid="task"
    >
      <TaskPills task={task} today={today} />
      <h3 id={`task-${task.id}`} className="text-lg font-bold" dir="auto">
        <Link href={`/member/tasks/${task.id}`} className="underline-offset-4 hover:underline">
          {task.title}
        </Link>
      </h3>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        {task.due_on ? (
          <div className="flex gap-1">
            <dt>{t('due')}</dt>
            <dd>
              <time dateTime={task.due_on}>{formatShortDate(task.due_on, locale)}</time>
            </dd>
          </div>
        ) : null}
        {task.project ? (
          <div className="flex gap-1">
            <dt>{t('project')}</dt>
            <dd dir="auto">{task.project.name}</dd>
          </div>
        ) : null}
        <div className="flex gap-1">
          <dt>{t('assignees')}</dt>
          <dd>{assignees ? <bdi>{assignees}</bdi> : t('nobody')}</dd>
        </div>
      </dl>
      {children}
    </article>
  );
}

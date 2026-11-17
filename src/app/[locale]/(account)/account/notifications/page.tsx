import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Pill } from '@/components/content/pill';
import { ActionForm } from '@/components/forms/action-form';
import { describeNotification } from '@/features/notifications/describe';
import { markAllNotificationsRead, markNotificationRead } from '@/features/notifications/actions';
import { listNotifications } from '@/features/notifications/queries';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guards';
import { formatDateTime } from '@/lib/content/format';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/notifications'>): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return pageMetadata({
    locale,
    path: '/account/notifications',
    title: t('title'),
    description: t('description'),
    noindex: true,
  });
}

/** The user's in-app notifications, newest first: profile decisions, meetings, tasks, announcements. */
export default async function NotificationsPage({
  params,
}: PageProps<'/[locale]/account/notifications'>) {
  const locale = await resolveLocaleParam(params);
  const user = await requireUser({ returnTo: '/account/notifications' });
  const t = await getTranslations({ locale });
  const notifications = await listNotifications(user.id);
  const unread = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <Link href="/account" className="w-fit text-sm font-semibold underline underline-offset-4">
          {t('notifications.backToAccount')}
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{t('notifications.title')}</h1>
        <p className="text-muted-foreground" data-testid="notifications-unread">
          {t('notifications.unread', { count: unread })}
        </p>
      </header>

      {unread > 0 ? (
        <ActionForm
          action={markAllNotificationsRead}
          submitLabel={t('notifications.markAllRead')}
          submitVariant="outline"
        />
      ) : null}

      {notifications.length === 0 ? (
        <EmptyState>{t('notifications.empty')}</EmptyState>
      ) : (
        <ol className="flex flex-col gap-4">
          {notifications.map((notification) => {
            const view = describeNotification(notification.kind, notification.payload);
            const message = t(`notifications.kinds.${view.key}`, {
              title: view.values.title || t('notifications.untitled'),
              name: view.values.name || t('notifications.untitled'),
            });
            return (
              <li key={notification.id}>
                <article
                  className="flex flex-col gap-2 rounded-2xl border-2 p-5 data-[unread=true]:border-foreground"
                  data-unread={!notification.read_at}
                  data-testid="notification"
                  data-kind={notification.kind}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {notification.read_at ? null : (
                      <Pill tone="primary">{t('notifications.new')}</Pill>
                    )}
                    <time dateTime={notification.created_at}>
                      {formatDateTime(notification.created_at, locale)}
                    </time>
                  </div>
                  <p className="font-semibold" dir="auto">
                    {view.href ? (
                      <Link href={view.href} className="underline-offset-4 hover:underline">
                        {message}
                      </Link>
                    ) : (
                      message
                    )}
                  </p>
                  {view.note ? (
                    <p className="text-sm whitespace-pre-line" dir="auto">
                      {t('notifications.note', { note: view.note })}
                    </p>
                  ) : null}
                  {notification.read_at ? null : (
                    <ActionForm
                      action={markNotificationRead}
                      hidden={{ notificationId: notification.id }}
                      submitLabel={t('notifications.markRead')}
                      submitVariant="outline"
                    />
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/content/avatar';
import { EmptyState } from '@/components/content/empty-state';
import { AreaPage } from '@/components/layout/area-page';
import { listDirectory } from '@/features/directory/queries';
import { intlLocale } from '@/i18n/locale';
import { getSessionRole, requireRole } from '@/lib/auth/guards';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { formatShortDate } from '@/lib/content/format';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member/directory'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'directory');
}

const roleOrder = { admin: 0, board: 1, member: 2 } as const;

/** Active members by role, then name. The board also sees phone numbers. */
export default async function DirectoryPage({ params }: PageProps<'/[locale]/member/directory'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('member', { returnTo: '/member/directory' });
  const t = await getTranslations({ locale });
  const isBoard = hasRoleAtLeast(await getSessionRole(), 'board');
  const collator = new Intl.Collator(intlLocale[locale]);
  const members = (await listDirectory(isBoard)).sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role] || collator.compare(a.name, b.name),
  );

  return (
    <AreaPage
      title={t('areas.member.sections.directory.title')}
      description={
        isBoard ? t('memberSpace.directory.boardIntro') : t('memberSpace.directory.intro')
      }
    >
      {members.length === 0 ? (
        <EmptyState>{t('memberSpace.directory.empty')}</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="directory">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center gap-4 rounded-2xl border-2 p-4"
              data-testid="directory-entry"
            >
              <Avatar name={member.name} className="size-12 text-base" />
              <div className="flex min-w-0 flex-col">
                <p className="truncate font-bold">
                  <bdi>{member.name}</bdi>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(`auth.account.roles.${member.role}`)}
                </p>
                {member.joinedOn ? (
                  <p className="text-sm text-muted-foreground">
                    {t('memberSpace.directory.joined', {
                      date: formatShortDate(member.joinedOn, locale),
                    })}
                  </p>
                ) : null}
                {isBoard && member.phone ? (
                  <p className="text-sm">
                    <a
                      href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}
                      dir="ltr"
                      className="underline"
                    >
                      {member.phone}
                    </a>
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AreaPage>
  );
}

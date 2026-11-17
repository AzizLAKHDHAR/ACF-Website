import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ProfileStatus } from '../schemas';

const tone: Record<ProfileStatus, string> = {
  draft: 'border-border text-muted-foreground',
  pending: 'border-foreground',
  approved: 'border-primary-border bg-primary text-primary-foreground',
  rejected: 'border-destructive text-destructive',
  suspended: 'border-destructive text-destructive',
};

/** A profile's status as a text badge (never colour alone: the word is always there). */
export function StatusBadge({ status, className }: { status: ProfileStatus; className?: string }) {
  const t = useTranslations('profiles.status');
  return (
    <span
      data-testid="profile-status"
      className={cn(
        'inline-flex w-fit items-center rounded-full border-2 px-3 py-0.5 text-xs font-bold',
        tone[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}

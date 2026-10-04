import { useTranslations } from 'next-intl';
import { PublicShell } from '@/components/layout/public-shell';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <PublicShell>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-sm font-semibold tracking-widest text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <Button asChild className="mt-2">
          <Link href="/">{t('backHome')}</Link>
        </Button>
      </div>
    </PublicShell>
  );
}

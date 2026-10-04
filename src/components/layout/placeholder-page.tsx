import { ConstructionIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Body of every page whose real content arrives in a later phase. */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  const t = useTranslations('common');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
      <p className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
        <ConstructionIcon className="size-3.5" aria-hidden />
        {t('comingSoon')}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-lg text-muted-foreground">{description}</p>
      <p className="rounded-lg border border-dashed bg-muted p-4 text-sm text-muted-foreground">
        {t('placeholderNotice')}
      </p>
    </div>
  );
}

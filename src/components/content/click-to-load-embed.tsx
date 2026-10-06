'use client';

import { PlayIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Embed } from '@/lib/content/embeds';

const providerName: Record<Embed['provider'], string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
};

/** A player that loads nothing from the provider until the visitor asks for it. */
export function ClickToLoadEmbed({ embed }: { embed: Embed }) {
  const t = useTranslations('content.embed');
  const [loaded, setLoaded] = useState(false);
  const provider = providerName[embed.provider];
  const tall = embed.provider === 'youtube';

  if (loaded) {
    return (
      <iframe
        src={embed.src}
        title={t('title', { provider })}
        className={
          tall ? 'aspect-video w-full rounded-2xl border-2' : 'h-40 w-full rounded-2xl border-2'
        }
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed p-5">
      <Button type="button" variant="outline" onClick={() => setLoaded(true)}>
        <PlayIcon aria-hidden />
        {t('play', { provider })}
      </Button>
      <p className="text-sm text-muted-foreground">{t('notice', { provider })}</p>
    </div>
  );
}

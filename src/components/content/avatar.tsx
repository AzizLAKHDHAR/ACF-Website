import Image from 'next/image';
import { publicMediaUrl } from '@/lib/content/media';
import { cn } from '@/lib/utils';

/** Profile picture, or the name's initials on the brand colour when there is none. Decorative. */
export function Avatar({
  name,
  path,
  className,
}: {
  name: string;
  path?: string | null;
  className?: string;
}) {
  const src = publicMediaUrl(path);
  const initials = Array.from(name.replace(/\(.*?\)/g, '').trim())
    .filter((char, index, chars) => index === 0 || chars[index - 1] === ' ')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary-border bg-brand text-lg font-extrabold text-brand-foreground',
        className,
      )}
    >
      {src ? (
        <Image src={src} alt="" fill sizes="112px" className="object-cover" unoptimized />
      ) : (
        initials
      )}
    </span>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/forms/state';
import { checkImageFile, fitWithin, MAX_UPLOAD_BYTES } from '@/lib/media/images';
import { createClient } from '@/lib/supabase/browser';

type UploadError = 'fileType' | 'fileTooLarge' | 'uploadFailed' | 'forbidden';

/** Re-encodes an image at most `max` px on its longest side (WebP, or JPEG where WebP can't be encoded). */
async function resize(file: File, max: number): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d context');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode('image/webp');
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  const jpeg = await encode('image/jpeg');
  if (!jpeg) throw new Error('encoding failed');
  return { blob: jpeg, ext: 'jpg' };
}

/**
 * Picks an image, shrinks it in the browser, uploads it straight to `public-media` under `folder`
 * (the storage policy only accepts folders the user may write), then records it with `onUploaded`,
 * a Server Action that re-checks the path. Errors are shown in the page's language.
 */
export function ImageUpload({
  label,
  hint,
  folder,
  prefix,
  maxDimension,
  previewUrl,
  previewClassName,
  onUploaded,
  onRemove,
}: {
  label: string;
  hint?: string;
  folder: string;
  prefix: string;
  maxDimension: number;
  previewUrl: string | null;
  previewClassName?: string;
  onUploaded: (path: string) => Promise<FormState>;
  onRemove?: () => Promise<FormState>;
}) {
  const t = useTranslations('forms');
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);
  const [done, setDone] = useState(false);

  async function handle(file: File) {
    setError(null);
    setDone(false);
    const check = checkImageFile(file);
    if (check !== 'ok') return setError(check);
    setBusy(true);
    try {
      const { blob, ext } = await resize(file, maxDimension);
      if (blob.size > MAX_UPLOAD_BYTES) return setError('fileTooLarge');
      const path = `${folder}/${prefix}-${Date.now().toString(36)}.${ext}`;
      const { error: uploadError } = await createClient()
        .storage.from('public-media')
        .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (uploadError) return setError('uploadFailed');
      const result = await onUploaded(path);
      if (!result?.ok) return setError(result?.error === 'forbidden' ? 'forbidden' : 'uploadFailed');
      setDone(true);
      router.refresh();
    } catch {
      setError('uploadFailed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    if (!onRemove) return;
    setBusy(true);
    setError(null);
    const result = await onRemove();
    setBusy(false);
    if (!result?.ok) return setError('uploadFailed');
    router.refresh();
  }

  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      {previewUrl ? (
        // A plain <img>: user uploads come from Supabase Storage, not next/image's configured hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className={previewClassName} />
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        disabled={busy}
        aria-describedby={[hint ? hintId : '', error ? errorId : ''].join(' ').trim() || undefined}
        aria-invalid={error ? true : undefined}
        className="text-sm file:me-3 file:rounded-full file:border-2 file:border-foreground file:bg-background file:px-4 file:py-2 file:font-semibold"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div aria-live="polite" className="text-sm">
        {busy ? <p role="status">{t('uploading')}</p> : null}
        {done && !busy ? (
          <p role="status" className="font-semibold">
            {t('notices.saved')}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="font-semibold text-destructive">
            {t(`uploadErrors.${error}`)}
          </p>
        ) : null}
      </div>
      {previewUrl && onRemove ? (
        <div>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={remove}>
            {t('removeImage')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

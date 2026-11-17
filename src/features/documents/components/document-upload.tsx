'use client';

import type * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { selectClass } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { audiences, type Audience } from '@/lib/forms/audience';
import type { FormState } from '@/lib/forms/state';
import { createClient } from '@/lib/supabase/browser';
import { checkDocumentFile, documentMimeType, documentTypes, libraryPath } from '../files';
import type { DocumentRecordInput } from '../schemas';

type Problem =
  | 'noFile'
  | 'fileType'
  | 'fileTooLarge'
  | 'empty'
  | 'noTitle'
  | 'uploadFailed'
  | 'forbidden'
  | 'failed';

const accept = [
  ...Object.keys(documentTypes),
  ...Object.values(documentTypes).map((extension) => `.${extension}`),
  '.jpeg',
].join(',');

/**
 * The board adds a document to the library: the file goes straight from the browser to the private
 * member-documents bucket (Server Actions cap bodies at 1 MB; documents may be 20 MB), then
 * `record` saves its row after re-checking everything. A file whose row can't be saved is removed.
 */
export function DocumentUpload({
  record,
}: {
  record: (input: DocumentRecordInput) => Promise<FormState>;
}) {
  const t = useTranslations('memberSpace');
  const tForms = useTranslations('forms');
  const router = useRouter();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    const title = String(data.get('title') ?? '').trim();
    setProblem(null);
    setDone(false);
    if (!(file instanceof File) || !file.name) return setProblem('noFile');
    const mimeType = documentMimeType(file);
    if (!mimeType) return setProblem('fileType');
    const check = checkDocumentFile(file);
    if (check !== 'ok') return setProblem(check);
    if (!title) return setProblem('noTitle');
    const audienceValue = String(data.get('audience'));
    const audience: Audience = audienceValue === 'board' ? 'board' : 'member';

    setBusy(true);
    const supabase = createClient();
    const path = libraryPath(crypto.randomUUID(), file.name);
    try {
      const upload = await supabase.storage
        .from('member-documents')
        .upload(path, file, { contentType: mimeType, upsert: false });
      if (upload.error) return setProblem('uploadFailed');
      const result = await record({
        path,
        title,
        category: String(data.get('category') ?? ''),
        audience,
        mimeType,
        size: file.size,
      });
      if (!result?.ok) {
        await supabase.storage.from('member-documents').remove([path]);
        return setProblem(result?.error === 'forbidden' ? 'forbidden' : 'failed');
      }
      form.reset();
      setDone(true);
      router.refresh();
    } catch {
      setProblem('uploadFailed');
    } finally {
      setBusy(false);
    }
  }

  const problemId = `${id}-problem`;
  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border-2 p-6"
      data-testid="document-upload"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-file`}>{t('documents.upload.file')}</Label>
        <input
          id={`${id}-file`}
          name="file"
          type="file"
          accept={accept}
          required
          disabled={busy}
          aria-describedby={`${id}-file-hint${problem ? ` ${problemId}` : ''}`}
          className="text-sm file:me-3 file:rounded-full file:border-2 file:border-foreground file:bg-background file:px-4 file:py-2 file:font-semibold"
        />
        <p id={`${id}-file-hint`} className="text-sm text-muted-foreground">
          {t('documents.upload.fileHint')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-title`}>{t('documents.upload.title')}</Label>
        <Input id={`${id}-title`} name="title" required maxLength={200} dir="auto" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-category`}>{t('documents.upload.category')}</Label>
          <Input id={`${id}-category`} name="category" maxLength={80} dir="auto" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-audience`}>{t('audience.label')}</Label>
          <select
            id={`${id}-audience`}
            name="audience"
            className={selectClass}
            defaultValue="member"
          >
            {audiences.map((value) => (
              <option key={value} value={value}>
                {t(`audience.${value}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={busy} aria-disabled={busy}>
          {busy ? tForms('uploading') : t('documents.upload.submit')}
        </Button>
        <div aria-live="polite" className="min-w-0 flex-1 text-sm">
          {done ? (
            <p role="status" className="font-semibold">
              {tForms('notices.uploaded')}
            </p>
          ) : null}
          {problem ? (
            <p id={problemId} role="alert" className="font-semibold text-destructive">
              {t(`documents.upload.problems.${problem}`)}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/content/empty-state';
import { Pill } from '@/components/content/pill';
import { ActionForm } from '@/components/forms/action-form';
import { AreaPage, AreaSection } from '@/components/layout/area-page';
import { deleteDocument, recordDocument } from '@/features/documents/actions';
import { DocumentUpload } from '@/features/documents/components/document-upload';
import { documentTypes, formatFileSize, type DocumentMimeType } from '@/features/documents/files';
import { listLibraryDocuments } from '@/features/documents/queries';
import { intlLocale } from '@/i18n/locale';
import { getSessionRole, requireRole } from '@/lib/auth/guards';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { formatShortDate } from '@/lib/content/format';
import { resolveLocaleParam } from '@/lib/i18n-params';
import { areaMetadata } from '@/lib/routes/area-metadata';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/member/documents'>): Promise<Metadata> {
  return areaMetadata(await resolveLocaleParam(params), 'member', 'documents');
}

function extensionOf(mimeType: string): string {
  return mimeType in documentTypes
    ? documentTypes[mimeType as DocumentMimeType].toUpperCase()
    : mimeType;
}

/**
 * The association's document library. Downloads go through a server route that checks access and
 * redirects to a signed URL valid for a minute; the bucket itself is private. The board uploads and
 * deletes documents here.
 */
export default async function DocumentsPage({ params }: PageProps<'/[locale]/member/documents'>) {
  const locale = await resolveLocaleParam(params);
  await requireRole('member', { returnTo: '/member/documents' });
  const t = await getTranslations({ locale });
  const [documents, role] = await Promise.all([listLibraryDocuments(), getSessionRole()]);
  const isBoard = hasRoleAtLeast(role, 'board');

  return (
    <AreaPage
      title={t('areas.member.sections.documents.title')}
      description={t('areas.member.sections.documents.description')}
    >
      {documents.length === 0 ? (
        <EmptyState>{t('memberSpace.documents.empty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {documents.map((document) => (
            <li key={document.id}>
              <article
                aria-labelledby={`document-${document.id}`}
                className="flex flex-col gap-3 rounded-2xl border-2 p-5 sm:flex-row sm:items-center"
                data-testid="document"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{extensionOf(document.mime_type)}</Pill>
                    {document.audience === 'board' ? (
                      <Pill tone="strong">{t('memberSpace.audience.boardOnly')}</Pill>
                    ) : null}
                    {document.category ? (
                      <span className="text-sm text-muted-foreground" dir="auto">
                        {document.category}
                      </span>
                    ) : null}
                  </div>
                  <h2 id={`document-${document.id}`} className="text-lg font-bold" dir="auto">
                    {document.title}
                  </h2>
                  <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    <span>{formatFileSize(document.size_bytes, intlLocale[locale])}</span>
                    <time dateTime={document.created_at}>
                      {formatShortDate(document.created_at, locale)}
                    </time>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* A plain link: the route answers with a redirect to a short-lived signed URL. */}
                  <a
                    href={`/${locale}/member/documents/${document.id}/download`}
                    className="inline-flex h-10 items-center rounded-full border-2 border-primary-border bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85"
                    data-testid="document-download"
                  >
                    {t('memberSpace.documents.download')}
                    {/* Names the file for screen readers while keeping the visible word first. */}
                    <span className="sr-only">
                      {' '}
                      <bdi>{document.title}</bdi>
                    </span>
                  </a>
                  {isBoard ? (
                    <ActionForm
                      action={deleteDocument}
                      hidden={{ documentId: document.id }}
                      submitLabel={t('memberSpace.documents.delete')}
                      submitVariant="outline"
                      confirmMessage={t('memberSpace.documents.deleteConfirm', {
                        title: document.title,
                      })}
                    />
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {isBoard ? (
        <AreaSection
          id="add-document"
          title={t('memberSpace.documents.upload.heading')}
          description={t('memberSpace.documents.upload.intro')}
        >
          <DocumentUpload record={recordDocument} />
        </AreaSection>
      ) : null}
    </AreaPage>
  );
}

import { createTranslator } from 'next-intl';
import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import type { Locale } from '@/i18n/routing';

// The email a profile's managers receive when the admin decides on it, in each manager's preferred
// locale. Plain text on purpose (like the contact form, D-064): the admin's note is shown as typed,
// never interpreted as HTML, and plain text renders the same in every client and script direction.

const messagesByLocale = { ar, fr, en } as const;

export type ReviewDecision = 'approved' | 'rejected' | 'suspended' | 'reinstated';

export type ReviewDecisionEmail = { subject: string; text: string };

export function renderReviewDecisionEmail(input: {
  locale: Locale;
  decision: ReviewDecision;
  recipientName: string;
  profileName: string;
  notePublic: string | null;
  /** Absolute URL of the profile editor in the recipient's locale. */
  editorUrl: string;
  /** Absolute URL of the public page (approved and reinstated only). */
  publicUrl: string | null;
}): ReviewDecisionEmail {
  const t = createTranslator({
    locale: input.locale,
    messages: messagesByLocale[input.locale],
    namespace: 'emails.review',
  });
  // Names are user text: strip line breaks so they can't forge extra lines or headers.
  const profileName = input.profileName.replace(/[\r\n]+/g, ' ').trim();
  const recipientName = input.recipientName.replace(/[\r\n]+/g, ' ').trim();
  const lines = [
    t('greeting', { name: recipientName }),
    '',
    t(`${input.decision}.body`, { profile: profileName }),
  ];
  if (input.notePublic?.trim()) {
    lines.push('', t('noteLabel'), input.notePublic.trim());
  }
  if (input.publicUrl && (input.decision === 'approved' || input.decision === 'reinstated')) {
    lines.push('', t('publicLink'), input.publicUrl);
  }
  lines.push('', t('editorLink'), input.editorUrl, '', t('signature'));
  return {
    subject: t(`${input.decision}.subject`, { profile: profileName }),
    text: lines.join('\n'),
  };
}

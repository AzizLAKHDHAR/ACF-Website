'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { renderReviewDecisionEmail } from '@/emails/review-decision';
import { sectionByProfileType } from '@/features/catalogue/queries';
import { requireRole } from '@/lib/auth/guards';
import { isEmailConfigured, sendEmail } from '@/lib/email/resend';
import { publicEnv } from '@/lib/env';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { contentTags } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import { reviewProfileSchema } from './schemas';

/**
 * Admin decision on a profile: approve or reject a pending one, suspend an approved one, reinstate
 * a suspended one. public.review_profile() re-checks the role and the transition, writes
 * review_events (+ the internal note), notifies every manager in-app; the status trigger writes
 * audit_log. Then each manager gets an email in their own language.
 */
export async function reviewProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = reviewProfileSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('admin');
  const { profileId, decision, notePublic, noteInternal } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc('review_profile', {
    profile: profileId,
    decision,
    note_public: notePublic ?? undefined,
    note_internal: noteInternal ?? undefined,
  });
  if (error) return fromDbError(error);

  revalidateTag(contentTags.profiles, { expire: 0 });
  revalidatePath('/[locale]/admin', 'layout');
  revalidatePath('/[locale]/account', 'layout');

  const emailsSent = await emailManagers(profileId, decision, notePublic);
  return ok(decision, { emailsSent });
}

async function emailManagers(
  profileId: string,
  decision: 'approved' | 'rejected' | 'suspended' | 'reinstated',
  notePublic: string | null,
): Promise<number> {
  if (!isEmailConfigured()) return 0;
  const supabase = await createClient();
  const [{ data: recipients, error }, { data: profile }] = await Promise.all([
    supabase.rpc('profile_review_recipients', { profile: profileId }),
    supabase
      .from('public_profiles')
      .select('type, slug, display_name')
      .eq('id', profileId)
      .single(),
  ]);
  if (error || !recipients || !profile) {
    console.error('[review] could not load email recipients', error?.message);
    return 0;
  }
  const site = publicEnv.NEXT_PUBLIC_SITE_URL;
  const results = await Promise.all(
    recipients.map((recipient) => {
      const email = renderReviewDecisionEmail({
        locale: recipient.locale,
        decision,
        recipientName: recipient.display_name,
        profileName: profile.display_name,
        notePublic,
        editorUrl: `${site}/${recipient.locale}/account/profiles/${profileId}`,
        publicUrl: `${site}/${recipient.locale}/${sectionByProfileType[profile.type]}/${profile.slug}`,
      });
      return sendEmail({ to: recipient.email, ...email });
    }),
  );
  return results.filter(Boolean).length;
}

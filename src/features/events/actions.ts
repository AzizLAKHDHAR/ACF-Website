'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireRole, requireUser } from '@/lib/auth/guards';
import { randomSuffix, slugOrFallback } from '@/lib/content/slug';
import { formDataToRecord, fromDbError, invalid, ok, type FormState } from '@/lib/forms/state';
import { contentTags } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import { eventDecisionSchema, proposeEventSchema } from './schemas';

/**
 * An approved artist or venue proposes an event. public.propose_event() checks that the caller
 * manages an approved artist/venue profile, pins a venue's proposal to that venue, puts an artist
 * in the line-up, and records the submission in review_events. The board then decides.
 */
export async function proposeEvent(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = proposeEventSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireUser();
  const value = parsed.data;
  const baseSlug = slugOrFallback(
    value.title.fr ?? value.title.en ?? value.title.ar ?? '',
    'event',
    randomSuffix,
  ).slice(0, 100);

  const supabase = await createClient();
  const propose = (slug: string) =>
    supabase.rpc('propose_event', {
      as_profile: value.profileId,
      slug,
      title: value.title,
      description: value.description,
      starts_at: value.startsAt,
      ends_at: value.endsAt ?? undefined,
      venue_text: value.venueText ?? undefined,
      governorate_code: value.governorate ?? undefined,
      ticket_url: value.ticketUrl ?? undefined,
      is_free: value.isFree,
    });
  let result = await propose(baseSlug);
  // Event slugs are unique: a taken one gets a short random suffix, once.
  if (result.error?.code === '23505') result = await propose(`${baseSlug}-${randomSuffix()}`);
  if (result.error) return fromDbError(result.error);
  revalidatePath('/[locale]/account', 'layout');
  revalidatePath('/[locale]/board', 'layout');
  return ok('proposed');
}

/** Board decision on a proposal: publish it, or turn it down with a note for the proposer. */
export async function decideEvent(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = eventDecisionSchema.safeParse(formDataToRecord(formData));
  if (!parsed.success) return invalid(parsed.error);
  await requireRole('board');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_event_status', {
    event: parsed.data.eventId,
    new_status: parsed.data.decision,
    note_public: parsed.data.notePublic ?? undefined,
  });
  if (error) return fromDbError(error);
  revalidateTag(contentTags.events, { expire: 0 });
  revalidatePath('/[locale]/board', 'layout');
  revalidatePath('/[locale]/account', 'layout');
  return ok(parsed.data.decision);
}

import { z } from 'zod';
import { uuid } from '@/features/profiles/schemas';

export const reviewDecisions = ['approved', 'rejected', 'suspended', 'reinstated'] as const;

const note = z
  .string()
  .trim()
  .max(2000, 'tooLong')
  .optional()
  .transform((value) => (value ? value : null));

/** An admin decision on a profile. A rejection or suspension must tell the owner why. */
export const reviewProfileSchema = z
  .object({
    profileId: uuid,
    decision: z.enum(reviewDecisions, 'required'),
    notePublic: note,
    noteInternal: note,
  })
  .refine(
    (value) =>
      !(value.decision === 'rejected' || value.decision === 'suspended') || value.notePublic,
    { path: ['notePublic'], message: 'required' },
  );

/** Which decisions the admin can take from a status (mirrors public.review_profile()). */
export function decisionsFor(status: string): (typeof reviewDecisions)[number][] {
  switch (status) {
    case 'pending':
      return ['approved', 'rejected'];
    case 'approved':
      return ['suspended'];
    case 'suspended':
      return ['reinstated'];
    default:
      return [];
  }
}

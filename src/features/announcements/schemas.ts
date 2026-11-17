import { z } from 'zod';
import { audience, checkbox, id, requiredText } from '@/lib/forms/schemas';

// Announcements (roles.md §3): the board posts to members or to the board; members read their
// audience's feed. Pushing to Discord arrives with the integration in phase 8.

export const announcementSchema = z.object({
  title: requiredText(200),
  body: requiredText(10000),
  audience,
  pinned: checkbox,
});

export const announcementIdSchema = z.object({ announcementId: id });

/** Hide/show or pin/unpin: the target state travels with the form. */
export const announcementFlagSchema = z.object({
  announcementId: id,
  value: z.enum(['true', 'false'], 'required').transform((value) => value === 'true'),
});

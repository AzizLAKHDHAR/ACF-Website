import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { serverEnv } from '@/lib/env.server';
import { secretsMatch } from '@/lib/security/secrets';
import { contentTags, type ContentTag } from '@/lib/supabase/public';

// Cache revalidation for public pages (D-062). Called by a Supabase Database Webhook (or any trusted
// job) with `Authorization: Bearer <CONTENT_WEBHOOK_SECRET>` and a body naming the changed table,
// e.g. Supabase's `{ "type": "UPDATE", "table": "events", … }`. Publishing done inside the app calls
// revalidateTag directly; this covers changes made elsewhere. Pages also expire after 5 minutes.

const tagsByTable: Record<string, ContentTag[]> = {
  public_profiles: [contentTags.profiles],
  artist_details: [contentTags.profiles],
  professional_details: [contentTags.profiles],
  venue_details: [contentTags.profiles],
  studio_details: [contentTags.profiles],
  profile_genres: [contentTags.profiles],
  profile_professions: [contentTags.profiles],
  events: [contentTags.events],
  event_lineup: [contentTags.events],
  posts: [contentTags.posts],
  genres: [contentTags.taxonomies],
  professions: [contentTags.taxonomies],
  governorates: [contentTags.taxonomies],
  site_settings: [contentTags.settings],
};

const bodySchema = z.object({ table: z.string().min(1).max(63) });

export async function POST(request: NextRequest) {
  // Verify the caller before reading or doing anything else (CLAUDE.md → Security rule 9).
  const presented = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secretsMatch(presented, serverEnv.CONTENT_WEBHOOK_SECRET)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: 'invalid body' }, { status: 400 });

  const tags = tagsByTable[parsed.data.table] ?? [];
  // Expire immediately: the next visitor gets fresh content (publishing is rare, correctness wins).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: tags });
}

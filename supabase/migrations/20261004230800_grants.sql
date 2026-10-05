-- Explicit privileges for the API roles (D-049). RLS decides *which rows*; these grants decide
-- *which operations and columns* exist at all. Status, author and audit columns are deliberately
-- left out of UPDATE grants: they change only through SECURITY DEFINER functions or triggers.
-- New tables must add their grants here (or in their own migration) — the pgTAP suite checks it.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ── Anonymous visitors: the public catalogue and public settings ──────────────
grant select on public.governorates, public.genres, public.professions,
  public.public_profiles, public.artist_details, public.professional_details, public.venue_details,
  public.studio_details, public.profile_genres, public.profile_professions,
  public.posts, public.events, public.event_lineup, public.site_settings
  to anon;

-- ── Signed-in users (RLS narrows every one of these) ──────────────────────────
grant select on all tables in schema public to authenticated;
revoke select on public.notification_deliveries from authenticated;

-- Identity
grant update (display_name, avatar_path, preferred_locale) on public.accounts to authenticated;
grant update (phone) on public.account_private to authenticated;
grant insert (user_id, role, status, joined_on), update (role, status, joined_on), delete
  on public.memberships to authenticated;
grant insert (email, role, token_hash, expires_at), update (expires_at), delete on public.invitations to authenticated;

-- Catalogue
grant insert, update, delete on public.governorates, public.genres, public.professions to authenticated;
grant update (slug, display_name, tagline, bio, governorate_code, city, avatar_path, cover_path, links, public_contact),
  delete on public.public_profiles to authenticated;
grant update (contact_email, contact_phone) on public.profile_private to authenticated;
grant insert (profile_id, user_id, role), update (role), delete on public.profile_managers to authenticated;
grant insert, update, delete on public.artist_details, public.professional_details, public.venue_details,
  public.studio_details, public.profile_genres, public.profile_professions to authenticated;

-- Content
grant insert (kind, blog_profile_id, locale, translation_group, slug, title, excerpt, body_md, cover_path),
  update (slug, title, excerpt, body_md, cover_path), delete on public.posts to authenticated;
grant insert (slug, title, description, starts_at, ends_at, venue_profile_id, venue_text, governorate_code,
              cover_path, ticket_url, is_free, organized_by_acf),
  update (slug, title, description, starts_at, ends_at, venue_profile_id, venue_text, governorate_code,
          cover_path, ticket_url, is_free, organized_by_acf),
  delete on public.events to authenticated;
grant insert (event_id, profile_id, role, position), update (role, position), delete on public.event_lineup to authenticated;

-- Member space
grant insert (collection, audience, title, category, storage_path, mime_type, size_bytes, version, supersedes_id),
  update (audience, title, category, archived_at, version, supersedes_id), delete on public.documents to authenticated;
grant insert (title, description_md, starts_at, ends_at, location_text, online_url, audience, minutes_document_id),
  update (title, description_md, starts_at, ends_at, location_text, online_url, audience, minutes_document_id, cancelled_at),
  delete on public.meetings to authenticated;
grant insert (meeting_id, user_id, response, note), update (response, note) on public.meeting_rsvps to authenticated;
grant insert (name, status, starts_on, ends_on), update (name, status, starts_on, ends_on), delete on public.projects to authenticated;
grant insert (title, description_md, status, priority, due_on, project_id, audience, is_open),
  update (title, description_md, status, priority, due_on, project_id, audience, is_open),
  delete on public.tasks to authenticated;
grant insert (task_id, user_id), delete on public.task_assignees to authenticated;
grant insert (task_id, body_md), update (body_md), delete on public.task_comments to authenticated;
grant insert (audience, title, body_md, pinned, published_at, discord_posted_message_id),
  update (audience, title, body_md, pinned, edited_at, hidden_at, discord_posted_message_id),
  delete on public.announcements to authenticated;
grant insert (title, description_md, kind, multi, audience, closes_at),
  update (title, description_md, kind, multi, audience, closes_at), delete on public.polls to authenticated;
grant insert (poll_id, label, starts_at, ends_at, position), update (label, starts_at, ends_at, position),
  delete on public.poll_options to authenticated;
grant insert (option_id, user_id, value), update (value), delete on public.poll_votes to authenticated;
grant insert (event_id, role_label, starts_at, ends_at, capacity), update (role_label, starts_at, ends_at, capacity),
  delete on public.volunteer_shifts to authenticated;
grant insert (shift_id, user_id), delete on public.volunteer_signups to authenticated;

-- Board space
grant insert (project_id, total_planned_millimes, notes), update (total_planned_millimes, notes), delete
  on public.project_budgets to authenticated;
grant insert (project_id, category, label, planned_millimes), update (category, label, planned_millimes), delete
  on public.budget_lines to authenticated;
grant insert (label, starts_on, ends_on), update (label, starts_on, ends_on) on public.ledger_periods to authenticated;
grant insert (entry_date, direction, amount_millimes, category, project_id, budget_line_id, counterparty,
              payment_method, reference, description, reverses_entry_id),
  update (entry_date, direction, amount_millimes, category, project_id, budget_line_id, counterparty,
          payment_method, reference, description, deleted_at)
  on public.ledger_entries to authenticated;
grant insert (ledger_entry_id, storage_path, mime_type, size_bytes), delete on public.receipts to authenticated;
grant insert (subject, direction, counterpart, counterpart_email, owner_id, due_on, signature_provider, signature_request_id),
  update (subject, direction, counterpart, counterpart_email, owner_id, due_on, signature_provider, signature_request_id),
  delete on public.correspondence to authenticated;
grant insert (correspondence_id, kind, storage_path, mime_type, size_bytes), delete
  on public.correspondence_documents to authenticated;

-- Platform
grant insert (target_type, target_id, reason, details), update (status, resolution_note)
  on public.moderation_reports to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert, update, delete on public.site_settings, public.integration_state to authenticated;

-- ── RPCs (signed-in users; each function re-checks the caller) ────────────────
grant execute on function
  public.create_profile(public.profile_type, text, text),
  public.submit_profile(uuid),
  public.review_profile(uuid, text, text, text),
  public.set_post_status(uuid, public.content_status, text),
  public.propose_event(uuid, text, jsonb, timestamptz, timestamptz, jsonb, uuid, text, text, text, boolean),
  public.set_event_status(uuid, public.content_status, text),
  public.set_task_status(uuid, public.task_status),
  public.meeting_rsvp_counts(uuid),
  public.volunteer_shift_counts(uuid),
  public.transition_correspondence(uuid, public.correspondence_status, text),
  public.set_ledger_period_closed(uuid, boolean),
  public.set_account_deactivated(uuid, boolean),
  public.request_account_deletion()
  to authenticated;

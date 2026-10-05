-- Covering indexes for foreign keys (Supabase performance advisor 0001): keeps cascades, joins and
-- RLS subqueries on these columns from scanning whole tables.

create index announcements_author_id_idx on public.announcements (author_id);
create index correspondence_documents_uploaded_by_idx on public.correspondence_documents (uploaded_by);
create index correspondence_events_actor_id_idx on public.correspondence_events (actor_id);
create index correspondence_owner_id_idx on public.correspondence (owner_id);
create index documents_supersedes_id_idx on public.documents (supersedes_id);
create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index events_governorate_code_idx on public.events (governorate_code);
create index events_published_by_idx on public.events (published_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index ledger_entries_budget_line_id_idx on public.ledger_entries (budget_line_id);
create index ledger_entries_created_by_idx on public.ledger_entries (created_by);
create index ledger_periods_closed_by_idx on public.ledger_periods (closed_by);
create index meetings_created_by_idx on public.meetings (created_by);
create index meetings_minutes_document_id_idx on public.meetings (minutes_document_id);
create index memberships_granted_by_idx on public.memberships (granted_by);
create index moderation_reports_reporter_id_idx on public.moderation_reports (reporter_id);
create index moderation_reports_resolved_by_idx on public.moderation_reports (resolved_by);
create index notification_deliveries_user_id_idx on public.notification_deliveries (user_id);
create index polls_created_by_idx on public.polls (created_by);
create index posts_author_id_idx on public.posts (author_id);
create index profile_managers_added_by_idx on public.profile_managers (added_by);
create index projects_created_by_idx on public.projects (created_by);
create index public_profiles_approved_by_idx on public.public_profiles (approved_by);
create index public_profiles_created_by_idx on public.public_profiles (created_by);
create index receipts_uploaded_by_idx on public.receipts (uploaded_by);
create index review_events_actor_id_idx on public.review_events (actor_id);
create index site_settings_updated_by_idx on public.site_settings (updated_by);
create index task_assignees_assigned_by_idx on public.task_assignees (assigned_by);
create index task_comments_author_id_idx on public.task_comments (author_id);
create index tasks_created_by_idx on public.tasks (created_by);

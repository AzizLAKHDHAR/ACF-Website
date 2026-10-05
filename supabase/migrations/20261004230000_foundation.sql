-- Foundation: extensions, the private helper schema, enums, role helpers and the audit log.
-- Authorization model: docs/roles.md (source of truth) and docs/architecture.md §6–7.

-- ── Extensions (kept out of `public`) ────────────────────────────────────────
create extension if not exists citext with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ── Privileges baseline ───────────────────────────────────────────────────────
-- Nothing in `public` is reachable by the API roles unless a migration grants it. Supabase's
-- defaults otherwise hand anon/authenticated TRUNCATE, REFERENCES and TRIGGER (TRUNCATE ignores RLS)
-- or full access on new tables, depending on the project setting (D-049).
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;

-- Helper functions used by RLS policies. Not exposed through the Data API (only `public` is), but
-- the API roles need USAGE/EXECUTE because policies run with the caller's privileges.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on functions from public;

-- ── Enums ─────────────────────────────────────────────────────────────────────
create type public.app_role as enum ('member', 'board', 'admin');
create type public.membership_status as enum ('active', 'suspended', 'alumni');
create type public.profile_type as enum ('artist', 'professional', 'venue', 'studio', 'blog');
create type public.profile_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type public.content_status as enum ('draft', 'pending', 'published', 'unpublished');
create type public.post_kind as enum ('news', 'blog');
create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
create type public.rsvp_response as enum ('yes', 'maybe', 'no');
create type public.poll_vote_value as enum ('yes', 'maybe', 'no');
create type public.ledger_direction as enum ('income', 'expense');
create type public.payment_method as enum ('cash', 'bank_transfer', 'cheque', 'card', 'other');
create type public.correspondence_status as enum ('draft', 'sent', 'awaiting_signature', 'signed', 'archived');
create type public.document_collection as enum ('library', 'legal');
create type public.locale as enum ('ar', 'fr', 'en');

-- ── Generic helpers ───────────────────────────────────────────────────────────
create function private.set_updated_at() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- unaccent() is only STABLE (its dictionary could change); this wrapper pins the dictionary so it
-- can be used in generated search columns.
create function private.immutable_unaccent(value text) returns text
  language sql immutable parallel safe strict set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, value) $$;

-- Parses a uuid without raising, for storage paths and other untrusted text.
create function private.try_uuid(value text) returns uuid
  language plpgsql immutable set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- Text of a locale map ({"ar": …, "fr": …, "en": …}) for search indexing.
create function private.locale_map_text(value jsonb) returns text
  language sql immutable parallel safe set search_path = ''
as $$ select coalesce(value ->> 'fr', '') || ' ' || coalesce(value ->> 'ar', '') || ' ' || coalesce(value ->> 'en', '') $$;

create function private.role_rank(r public.app_role) returns int
  language sql immutable parallel safe set search_path = ''
as $$ select case r when 'member' then 1 when 'board' then 2 when 'admin' then 3 end $$;

grant execute on function private.immutable_unaccent(text), private.try_uuid(text),
  private.locale_map_text(jsonb), private.role_rank(public.app_role)
  to anon, authenticated, service_role;

-- ── Audit log ─────────────────────────────────────────────────────────────────
-- Written only by the SECURITY DEFINER trigger below. Admins read it; nobody updates or deletes it.
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_role public.app_role,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb
);
create index audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
alter table public.audit_log enable row level security;

create function private.audit_log_immutable() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  raise exception 'audit_log rows are immutable' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();

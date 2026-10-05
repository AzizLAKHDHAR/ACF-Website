-- Platform and admin: moderation reports, notifications, delivery log, site settings, integration
-- state (docs/roles.md §1, §2, §5). The audit log lives in the foundation migration.

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('profile', 'post', 'event')),
  target_id uuid not null,
  reason text not null check (reason in ('inaccurate', 'impersonation', 'offensive', 'harassment',
                                         'copyright', 'spam', 'other')),
  details text check (details is null or char_length(details) <= 2000),
  reporter_id uuid references public.accounts (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.accounts (id) on delete set null,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index moderation_reports_status_idx on public.moderation_reports (status, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Written by cron jobs (service role) only; the unique key makes jobs idempotent.
create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target_id uuid not null,
  user_id uuid references public.accounts (id) on delete cascade,
  channel text not null check (channel in ('email', 'in_app', 'discord')),
  sent_at timestamptz not null default now(),
  unique nulls not distinct (kind, target_id, user_id, channel)
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.accounts (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.integration_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated_at before update on public.site_settings for each row execute function private.set_updated_at();
create trigger integration_state_updated_at before update on public.integration_state for each row execute function private.set_updated_at();
create trigger site_settings_audit after insert or update or delete on public.site_settings
  for each row execute function private.audit_row('key');

create function private.stamp_reporter() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.reporter_id := (select auth.uid());
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  new.resolution_note := null;
  return new;
end;
$$;
create trigger moderation_reports_stamp before insert on public.moderation_reports
  for each row execute function private.stamp_reporter();

create function private.stamp_resolution() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.resolved_by := case when new.status = 'open' then null else (select auth.uid()) end;
    new.resolved_at := case when new.status = 'open' then null else now() end;
  end if;
  return new;
end;
$$;
create trigger moderation_reports_resolution before update on public.moderation_reports
  for each row execute function private.stamp_resolution();

create function private.stamp_updated_by() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
create trigger site_settings_stamp before insert or update on public.site_settings
  for each row execute function private.stamp_updated_by();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.moderation_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.site_settings enable row level security;
alter table public.integration_state enable row level security;

-- Any signed-in user can flag something; admins work the queue.
create policy "moderation_reports: signed-in users report" on public.moderation_reports for insert to authenticated
  with check ((select private.is_active_user()));
create policy "moderation_reports: admin reads" on public.moderation_reports for select to authenticated
  using ((select private.has_role('admin')));
create policy "moderation_reports: admin resolves" on public.moderation_reports for update to authenticated
  using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));

-- Own notifications only (admins included); only read_at is updatable (column grant).
create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- notification_deliveries: deliberately no policies (deny-all for API roles; service role only).

create policy "site_settings: anyone reads public keys" on public.site_settings for select to anon
  using (is_public);
create policy "site_settings: public keys, or all for admins" on public.site_settings for select to authenticated
  using (is_public or (select private.has_role('admin')));
create policy "site_settings: admin manages (insert)" on public.site_settings for insert to authenticated
  with check ((select private.has_role('admin')));
create policy "site_settings: admin manages (update)" on public.site_settings for update to authenticated
  using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));
create policy "site_settings: admin manages (delete)" on public.site_settings for delete to authenticated
  using ((select private.has_role('admin')));

create policy "integration_state: admin reads" on public.integration_state for select to authenticated
  using ((select private.has_role('admin')));
create policy "integration_state: admin manages (insert)" on public.integration_state for insert to authenticated
  with check ((select private.has_role('admin')));
create policy "integration_state: admin manages (update)" on public.integration_state for update to authenticated
  using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));
create policy "integration_state: admin manages (delete)" on public.integration_state for delete to authenticated
  using ((select private.has_role('admin')));

-- The audit log: admins read; nobody writes through the API (rows come from private.audit_row()).
create policy "audit_log: admin reads" on public.audit_log for select to authenticated
  using ((select private.has_role('admin')));

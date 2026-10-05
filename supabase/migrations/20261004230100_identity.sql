-- Identity and access: accounts, memberships (association roles), invitations, role helpers,
-- the generic audit trigger and the guard rails around roles (docs/roles.md → Guard rails 1, 2, 6).

-- ── Tables ────────────────────────────────────────────────────────────────────
create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  avatar_path text,
  preferred_locale public.locale not null default 'fr',
  deactivated_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contact details are private columns, so they live in their own table (Guard rail 3).
create table public.account_private (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  phone text check (phone is null or char_length(phone) <= 32),
  updated_at timestamptz not null default now()
);

-- One row per user; hierarchy via private.role_rank().
create table public.memberships (
  user_id uuid primary key references public.accounts (id) on delete cascade,
  role public.app_role not null,
  status public.membership_status not null default 'active',
  joined_on date not null default current_date,
  granted_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memberships_role_status_idx on public.memberships (role, status);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null,
  role public.app_role not null,
  token_hash text unique,
  invited_by uuid references public.accounts (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invitations_email_idx on public.invitations (email) where accepted_at is null;

create trigger accounts_updated_at before update on public.accounts
  for each row execute function private.set_updated_at();
create trigger account_private_updated_at before update on public.account_private
  for each row execute function private.set_updated_at();
create trigger memberships_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();

-- ── Role helpers ──────────────────────────────────────────────────────────────
-- The caller's effective association role: an active membership on an account that is not
-- deactivated (Guard rail 6). NULL for anonymous and registered users.
create function private.current_app_role() returns public.app_role
  language sql stable security definer set search_path = ''
as $$
  select m.role
  from public.memberships m
  join public.accounts a on a.id = m.user_id
  where m.user_id = (select auth.uid())
    and m.status = 'active'
    and a.deactivated_at is null
$$;

create function private.has_role(min_role public.app_role) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select coalesce(private.role_rank(private.current_app_role()) >= private.role_rank(min_role), false)
$$;

-- True when the caller is signed in with an account that is not deactivated.
create function private.is_active_user() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = (select auth.uid()) and a.deactivated_at is null
  )
$$;

grant execute on function private.current_app_role(), private.has_role(public.app_role),
  private.is_active_user()
  to anon, authenticated, service_role;

-- ── Generic audit trigger ─────────────────────────────────────────────────────
-- Attach with `execute function private.audit_row('<key column>')` (defaults to `id`).
create function private.audit_row() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  key_column text := coalesce(tg_argv[0], 'id');
  old_json jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_json jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, old_data, new_data)
  values (
    (select auth.uid()),
    private.current_app_role(),
    lower(tg_op),
    tg_table_name,
    coalesce(new_json, old_json) ->> key_column,
    old_json,
    new_json
  );
  return coalesce(new, old);
end;
$$;

create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function private.audit_row('user_id');
create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function private.audit_row();
create trigger accounts_deactivation_audit after update of deactivated_at, deletion_requested_at on public.accounts
  for each row when (old.deactivated_at is distinct from new.deactivated_at
                     or old.deletion_requested_at is distinct from new.deletion_requested_at)
  execute function private.audit_row();

-- ── Guard rail 2: the last active admin can't be removed ──────────────────────
create function private.count_other_active_admins(excluded uuid) returns int
  language sql stable security definer set search_path = ''
as $$
  select count(*)::int
  from public.memberships m
  join public.accounts a on a.id = m.user_id
  where m.role = 'admin' and m.status = 'active' and a.deactivated_at is null
    and m.user_id <> excluded
$$;

create function private.protect_last_admin() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'admin' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active') then
    -- Serialize concurrent demotions so two admins can't remove each other at the same time.
    perform 1 from public.memberships where role = 'admin' and status = 'active' for update;
    if private.count_other_active_admins(old.user_id) = 0 then
      raise exception 'The last active admin cannot be demoted, suspended or removed'
        using errcode = 'P0001', hint = 'Grant the admin role to someone else first.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger memberships_protect_last_admin before update or delete on public.memberships
  for each row execute function private.protect_last_admin();

-- ── New users get an account (with their sign-up locale) and any pending invitation ──
create function private.handle_new_user() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  requested_locale text := new.raw_user_meta_data ->> 'locale';
  requested_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  insert into public.accounts (id, display_name, preferred_locale)
  values (
    new.id,
    left(coalesce(requested_name, split_part(coalesce(new.email, ''), '@', 1), 'ACF'), 120),
    case when requested_locale in ('ar', 'fr', 'en') then requested_locale::public.locale else 'fr' end
  );
  insert into public.account_private (account_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Invitations attach their role once the invited address is *verified*, so nobody can claim one by
-- signing up with someone else's email (architecture §6, invitations).
create function private.accept_invitations() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  invite record;
begin
  if new.email_confirmed_at is null or new.email is null then
    return new;
  end if;
  for invite in
    select * from public.invitations
    where email = new.email::extensions.citext and accepted_at is null and expires_at > now()
    order by private.role_rank(role) desc
    limit 1
  loop
    insert into public.memberships (user_id, role, granted_by)
    values (new.id, invite.role, invite.invited_by)
    on conflict (user_id) do update
      set role = excluded.role, status = 'active', granted_by = excluded.granted_by
      where private.role_rank(public.memberships.role) < private.role_rank(excluded.role)
         or public.memberships.status <> 'active';
    update public.invitations
      set accepted_at = now(), accepted_by = new.id
      where email = new.email::extensions.citext and accepted_at is null;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.accept_invitations();

-- ── RPCs ──────────────────────────────────────────────────────────────────────
-- Admin: deactivate or reactivate an account (a deactivated account has no role, Guard rail 6).
create function public.set_account_deactivated(target uuid, deactivated boolean) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  target_role public.app_role;
begin
  if not private.has_role('admin') then
    raise exception 'Only an admin can deactivate accounts' using errcode = '42501';
  end if;
  if deactivated then
    select role into target_role from public.memberships
      where user_id = target and status = 'active';
    if target_role = 'admin' then
      perform 1 from public.memberships where role = 'admin' and status = 'active' for update;
      if private.count_other_active_admins(target) = 0 then
        raise exception 'The last active admin cannot be deactivated' using errcode = 'P0001';
      end if;
    end if;
  end if;
  update public.accounts
    set deactivated_at = case when deactivated then coalesce(deactivated_at, now()) end
    where id = target;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Any user: ask for account deletion. Processing (anonymization) is a server job with the
-- service role (docs/roles.md → System actor).
create function public.request_account_deletion() returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update public.accounts
    set deletion_requested_at = coalesce(deletion_requested_at, now())
    where id = (select auth.uid());
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.accounts enable row level security;
alter table public.account_private enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

-- Accounts: self; members+ see the directory (names, avatars); admins see everyone.
create policy "accounts: read self or directory" on public.accounts
  for select to authenticated
  using (id = (select auth.uid()) or (select private.has_role('member')));
-- Self-service edits; which columns is restricted by column grants (display name, avatar, locale).
create policy "accounts: update self" on public.accounts
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Phone numbers: self, and board+ (member directory with contact details).
create policy "account_private: read self or board" on public.account_private
  for select to authenticated
  using (account_id = (select auth.uid()) or (select private.has_role('board')));
create policy "account_private: update self" on public.account_private
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

-- Memberships: own row; members+ see roles in the directory; only admins write (Guard rail 1).
create policy "memberships: read own or directory" on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('member')));
create policy "memberships: admin inserts" on public.memberships
  for insert to authenticated
  with check ((select private.has_role('admin')));
create policy "memberships: admin updates" on public.memberships
  for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));
create policy "memberships: admin deletes" on public.memberships
  for delete to authenticated
  using ((select private.has_role('admin')));

create policy "invitations: admin manages" on public.invitations
  for all to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

-- `granted_by` / `invited_by` come from the session, never from the client.
create function private.stamp_granted_by() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.granted_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create trigger memberships_stamp_granted_by before insert or update of role, status on public.memberships
  for each row execute function private.stamp_granted_by();

create function private.stamp_invited_by() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.invited_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create trigger invitations_stamp_invited_by before insert on public.invitations
  for each row execute function private.stamp_invited_by();

-- Public profiles and the catalogue: taxonomies, profiles, managers, type details, review workflow.
-- docs/roles.md §1. Profiles start as drafts, are submitted, then approved by an admin.

-- ── Taxonomies ────────────────────────────────────────────────────────────────
create table public.governorates (
  code text primary key check (code ~ '^TN-[0-9]{2}$'),
  name jsonb not null check (name ? 'ar' and name ? 'fr' and name ? 'en'),
  position smallint not null default 0
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null check (name ? 'ar' and name ? 'fr' and name ? 'en'),
  position smallint not null default 0
);

create table public.professions (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null check (name ? 'ar' and name ? 'fr' and name ? 'en'),
  position smallint not null default 0
);

-- ── Profiles ──────────────────────────────────────────────────────────────────
create table public.public_profiles (
  id uuid primary key default gen_random_uuid(),
  type public.profile_type not null,
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  status public.profile_status not null default 'draft',
  display_name text not null check (char_length(display_name) between 1 and 120),
  tagline jsonb not null default '{}'::jsonb,
  bio jsonb not null default '{}'::jsonb,
  governorate_code text references public.governorates (code),
  city text,
  avatar_path text,
  cover_path text,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  public_contact jsonb not null default '{}'::jsonb,
  created_by uuid references public.accounts (id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', private.immutable_unaccent(
      display_name || ' ' || coalesce(city, '') || ' ' || private.locale_map_text(tagline)
    ))
  ) stored
);
create index public_profiles_type_status_idx on public.public_profiles (type, status);
create index public_profiles_governorate_idx on public.public_profiles (governorate_code);
create index public_profiles_search_idx on public.public_profiles using gin (search);
create index public_profiles_name_trgm_idx on public.public_profiles
  using gin (display_name extensions.gin_trgm_ops);

create table public.profile_private (
  profile_id uuid primary key references public.public_profiles (id) on delete cascade,
  contact_email extensions.citext,
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 32),
  updated_at timestamptz not null default now()
);

create table public.profile_managers (
  profile_id uuid not null references public.public_profiles (id) on delete cascade,
  user_id uuid not null references public.accounts (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  added_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, user_id)
);
create index profile_managers_user_idx on public.profile_managers (user_id);

create table public.artist_details (
  profile_id uuid primary key references public.public_profiles (id) on delete cascade,
  kind text not null default 'solo' check (kind in ('solo', 'band', 'collective', 'dj')),
  formed_year smallint check (formed_year between 1900 and 2100)
);
create table public.professional_details (
  profile_id uuid primary key references public.public_profiles (id) on delete cascade,
  years_experience smallint check (years_experience between 0 and 80),
  available_for_hire boolean not null default false
);
create table public.venue_details (
  profile_id uuid primary key references public.public_profiles (id) on delete cascade,
  address text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  capacity integer check (capacity > 0),
  venue_kind text,
  has_backline boolean not null default false,
  accessibility jsonb not null default '{}'::jsonb
);
create table public.studio_details (
  profile_id uuid primary key references public.public_profiles (id) on delete cascade,
  address text,
  services text[] not null default '{}'
    check (services <@ array['recording', 'mixing', 'mastering', 'rehearsal', 'production'])
);

create table public.profile_genres (
  profile_id uuid not null references public.public_profiles (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  primary key (profile_id, genre_id)
);
create index profile_genres_genre_idx on public.profile_genres (genre_id);
create table public.profile_professions (
  profile_id uuid not null references public.public_profiles (id) on delete cascade,
  profession_id uuid not null references public.professions (id) on delete cascade,
  primary key (profile_id, profession_id)
);
create index profile_professions_profession_idx on public.profile_professions (profession_id);

-- Approval history for profiles, events and posts. The public note is visible to the people the
-- decision concerns; internal notes are private columns, so they live in their own table.
create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('profile', 'event', 'post')),
  target_id uuid not null,
  action text not null check (action in ('submitted', 'approved', 'rejected', 'suspended', 'reinstated',
                                          'published', 'unpublished')),
  actor_id uuid references public.accounts (id) on delete set null,
  note_public text,
  created_at timestamptz not null default now()
);
create index review_events_target_idx on public.review_events (target_type, target_id);
create table public.review_event_notes (
  review_event_id uuid primary key references public.review_events (id) on delete cascade,
  note_internal text not null
);

create trigger public_profiles_updated_at before update on public.public_profiles
  for each row execute function private.set_updated_at();
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function private.set_updated_at();
create trigger public_profiles_status_audit after update of status on public.public_profiles
  for each row when (old.status is distinct from new.status) execute function private.audit_row();

-- ── Helpers ───────────────────────────────────────────────────────────────────
create function private.manages_profile(profile uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.profile_managers pm
    where pm.profile_id = profile and pm.user_id = (select auth.uid())
  )
$$;

create function private.owns_profile(profile uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.profile_managers pm
    where pm.profile_id = profile and pm.user_id = (select auth.uid()) and pm.role = 'owner'
  )
$$;

-- The caller manages this profile, it is approved, and (optionally) it has one of these types.
create function private.manages_approved_profile(profile uuid, types public.profile_type[] default null)
  returns boolean
  language sql stable security definer set search_path = ''
as $$
  select private.manages_profile(profile) and exists (
    select 1 from public.public_profiles p
    where p.id = profile and p.status = 'approved' and (types is null or p.type = any (types))
  )
$$;

grant execute on function private.manages_profile(uuid), private.owns_profile(uuid),
  private.manages_approved_profile(uuid, public.profile_type[])
  to anon, authenticated, service_role;

-- Type details must match the profile type (artist_details only for artists, …).
create function private.check_profile_detail_type() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.public_profiles
    where id = new.profile_id and type = tg_argv[0]::public.profile_type
  ) then
    raise exception '% rows require a % profile', tg_table_name, tg_argv[0] using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger artist_details_type before insert or update on public.artist_details
  for each row execute function private.check_profile_detail_type('artist');
create trigger professional_details_type before insert or update on public.professional_details
  for each row execute function private.check_profile_detail_type('professional');
create trigger venue_details_type before insert or update on public.venue_details
  for each row execute function private.check_profile_detail_type('venue');
create trigger studio_details_type before insert or update on public.studio_details
  for each row execute function private.check_profile_detail_type('studio');

-- A profile always keeps at least one owner.
create function private.protect_last_profile_owner() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.public_profiles where id = old.profile_id)
     and not exists (
       select 1 from public.profile_managers
       where profile_id = old.profile_id and role = 'owner' and user_id <> old.user_id
     ) then
    raise exception 'A profile must keep at least one owner' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger profile_managers_protect_last_owner before update or delete on public.profile_managers
  for each row execute function private.protect_last_profile_owner();

create function private.stamp_added_by() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.added_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create trigger profile_managers_stamp_added_by before insert on public.profile_managers
  for each row execute function private.stamp_added_by();

-- ── RPCs: the profile workflow ────────────────────────────────────────────────
-- Creates a draft profile with the caller as owner, its private row and its type details, atomically.
create function public.create_profile(profile_type public.profile_type, slug text, display_name text)
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.is_active_user() then
    raise exception 'Sign in to create a profile' using errcode = '42501';
  end if;
  insert into public.public_profiles (type, slug, display_name, created_by)
  values (profile_type, slug, display_name, (select auth.uid()))
  returning id into new_id;
  insert into public.profile_managers (profile_id, user_id, role) values (new_id, (select auth.uid()), 'owner');
  insert into public.profile_private (profile_id) values (new_id);
  case profile_type
    when 'artist' then insert into public.artist_details (profile_id) values (new_id);
    when 'professional' then insert into public.professional_details (profile_id) values (new_id);
    when 'venue' then insert into public.venue_details (profile_id) values (new_id);
    when 'studio' then insert into public.studio_details (profile_id) values (new_id);
    else null;
  end case;
  return new_id;
end;
$$;

-- Owner/editor submits a draft (or a rejected profile) for review.
create function public.submit_profile(profile uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not private.manages_profile(profile) then
    raise exception 'You do not manage this profile' using errcode = '42501';
  end if;
  update public.public_profiles
    set status = 'pending', submitted_at = now()
    where id = profile and status in ('draft', 'rejected');
  if not found then
    raise exception 'Only draft or rejected profiles can be submitted' using errcode = 'P0001';
  end if;
  insert into public.review_events (target_type, target_id, action, actor_id)
  values ('profile', profile, 'submitted', (select auth.uid()));
end;
$$;

-- Admin decision: approve / reject a pending profile, suspend an approved one, reinstate a suspended one.
create function public.review_profile(profile uuid, decision text, note_public text default null,
                                      note_internal text default null)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  current_status public.profile_status;
  next_status public.profile_status;
  event_id uuid;
begin
  if not private.has_role('admin') then
    raise exception 'Only an admin can review profiles' using errcode = '42501';
  end if;
  select status into current_status from public.public_profiles where id = profile for update;
  if current_status is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  next_status := case
    when decision = 'approved' and current_status = 'pending' then 'approved'
    when decision = 'rejected' and current_status = 'pending' then 'rejected'
    when decision = 'suspended' and current_status = 'approved' then 'suspended'
    when decision = 'reinstated' and current_status = 'suspended' then 'approved'
  end::public.profile_status;
  if next_status is null then
    raise exception 'Cannot % a % profile', decision, current_status using errcode = 'P0001';
  end if;
  update public.public_profiles
    set status = next_status,
        approved_at = case when next_status = 'approved' then now() else approved_at end,
        approved_by = case when next_status = 'approved' then (select auth.uid()) else approved_by end
    where id = profile;
  insert into public.review_events (target_type, target_id, action, actor_id, note_public)
  values ('profile', profile, decision, (select auth.uid()), note_public)
  returning id into event_id;
  if nullif(btrim(note_internal), '') is not null then
    insert into public.review_event_notes (review_event_id, note_internal) values (event_id, note_internal);
  end if;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.governorates enable row level security;
alter table public.genres enable row level security;
alter table public.professions enable row level security;
alter table public.public_profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.profile_managers enable row level security;
alter table public.artist_details enable row level security;
alter table public.professional_details enable row level security;
alter table public.venue_details enable row level security;
alter table public.studio_details enable row level security;
alter table public.profile_genres enable row level security;
alter table public.profile_professions enable row level security;
alter table public.review_events enable row level security;
alter table public.review_event_notes enable row level security;

-- Taxonomies: everyone reads; admins manage.
create policy "governorates: anyone reads" on public.governorates for select to anon, authenticated using (true);
create policy "governorates: admin manages (insert)" on public.governorates for insert to authenticated
  with check ((select private.has_role('admin')));
create policy "governorates: admin manages (update)" on public.governorates for update to authenticated
  using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));
create policy "governorates: admin manages (delete)" on public.governorates for delete to authenticated
  using ((select private.has_role('admin')));
create policy "genres: anyone reads" on public.genres for select to anon, authenticated using (true);
create policy "genres: admin manages (insert)" on public.genres for insert to authenticated
  with check ((select private.has_role('admin')));
create policy "genres: admin manages (update)" on public.genres for update to authenticated
  using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));
create policy "genres: admin manages (delete)" on public.genres for delete to authenticated
  using ((select private.has_role('admin')));
create policy "professions: anyone reads" on public.professions for select to anon, authenticated using (true);
create policy "professions: admin manages (insert)" on public.professions for insert to authenticated
  with check ((select private.has_role('admin')));
create policy "professions: admin manages (update)" on public.professions for update to authenticated
  using ((select private.has_role('admin'))) with check ((select private.has_role('admin')));
create policy "professions: admin manages (delete)" on public.professions for delete to authenticated
  using ((select private.has_role('admin')));

-- Profiles: approved ones are public; managers see their own in any status; admins see all.
-- Inserts go through create_profile(); status changes through submit_profile()/review_profile().
create policy "public_profiles: anyone reads approved" on public.public_profiles
  for select to anon
  using (status = 'approved');
create policy "public_profiles: approved, managed or admin" on public.public_profiles
  for select to authenticated
  using (status = 'approved' or private.manages_profile(id) or (select private.has_role('admin')));
create policy "public_profiles: managers and admin update" on public.public_profiles
  for update to authenticated
  using (private.manages_profile(id) or (select private.has_role('admin')))
  with check (private.manages_profile(id) or (select private.has_role('admin')));
create policy "public_profiles: owners delete drafts, admin deletes" on public.public_profiles
  for delete to authenticated
  using ((status = 'draft' and private.owns_profile(id)) or (select private.has_role('admin')));

create policy "profile_private: managers and admin read" on public.profile_private
  for select to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_private: managers update" on public.profile_private
  for update to authenticated
  using (private.manages_profile(profile_id))
  with check (private.manages_profile(profile_id));

-- Managers: co-managers see each other; owners (and admins) add and remove managers; anyone may
-- leave a profile they manage (the last-owner trigger still applies).
create policy "profile_managers: managers and admin read" on public.profile_managers
  for select to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_managers: owners and admin add" on public.profile_managers
  for insert to authenticated
  with check (private.owns_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_managers: owners and admin change roles" on public.profile_managers
  for update to authenticated
  using (private.owns_profile(profile_id) or (select private.has_role('admin')))
  with check (private.owns_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_managers: owners, admin or self remove" on public.profile_managers
  for delete to authenticated
  using (private.owns_profile(profile_id) or user_id = (select auth.uid()) or (select private.has_role('admin')));

-- Type details and tags follow the visibility of their profile (the subquery runs under the
-- caller's RLS on public_profiles); managers and admins edit them.
create policy "artist_details: visible with profile" on public.artist_details for select to anon, authenticated
  using (exists (select 1 from public.public_profiles p where p.id = profile_id));
create policy "artist_details: managers and admin write (insert)" on public.artist_details for insert to authenticated
  with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "artist_details: managers and admin write (update)" on public.artist_details for update to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin'))) with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "artist_details: managers and admin write (delete)" on public.artist_details for delete to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "professional_details: visible with profile" on public.professional_details for select to anon, authenticated
  using (exists (select 1 from public.public_profiles p where p.id = profile_id));
create policy "professional_details: managers and admin write (insert)" on public.professional_details for insert to authenticated
  with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "professional_details: managers and admin write (update)" on public.professional_details for update to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin'))) with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "professional_details: managers and admin write (delete)" on public.professional_details for delete to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "venue_details: visible with profile" on public.venue_details for select to anon, authenticated
  using (exists (select 1 from public.public_profiles p where p.id = profile_id));
create policy "venue_details: managers and admin write (insert)" on public.venue_details for insert to authenticated
  with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "venue_details: managers and admin write (update)" on public.venue_details for update to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin'))) with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "venue_details: managers and admin write (delete)" on public.venue_details for delete to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "studio_details: visible with profile" on public.studio_details for select to anon, authenticated
  using (exists (select 1 from public.public_profiles p where p.id = profile_id));
create policy "studio_details: managers and admin write (insert)" on public.studio_details for insert to authenticated
  with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "studio_details: managers and admin write (update)" on public.studio_details for update to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin'))) with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "studio_details: managers and admin write (delete)" on public.studio_details for delete to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_genres: visible with profile" on public.profile_genres for select to anon, authenticated
  using (exists (select 1 from public.public_profiles p where p.id = profile_id));
create policy "profile_genres: managers and admin write (insert)" on public.profile_genres for insert to authenticated
  with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_genres: managers and admin write (update)" on public.profile_genres for update to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin'))) with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_genres: managers and admin write (delete)" on public.profile_genres for delete to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_professions: visible with profile" on public.profile_professions for select to anon, authenticated
  using (exists (select 1 from public.public_profiles p where p.id = profile_id));
create policy "profile_professions: managers and admin write (insert)" on public.profile_professions for insert to authenticated
  with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_professions: managers and admin write (update)" on public.profile_professions for update to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin'))) with check (private.manages_profile(profile_id) or (select private.has_role('admin')));
create policy "profile_professions: managers and admin write (delete)" on public.profile_professions for delete to authenticated
  using (private.manages_profile(profile_id) or (select private.has_role('admin')));

-- Review history: admins; managers of the profile; the proposer of an event; the author of a post.
-- Event and post rules are added with those tables (content migration).
-- One SELECT policy (event and post helpers are defined in the content migration, which replaces it).
create policy "review_events: admin or concerned managers read" on public.review_events for select to authenticated
  using ((select private.has_role('admin')) or (target_type = 'profile' and private.manages_profile(target_id)));
create policy "review_event_notes: admin reads" on public.review_event_notes for select to authenticated
  using ((select private.has_role('admin')));

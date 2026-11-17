-- Phase 4: profile onboarding and admin approval (docs/roadmap.md → Phase 4, docs/roles.md §1).
-- The profile workflow RPCs (create_profile, submit_profile, review_profile) exist since phase 2;
-- this migration adds what the onboarding screens need on top of them:
--   · co-managers invited by email, and a safe list of a profile's managers;
--   · in-app notifications for every manager when the admin decides on a profile;
--   · the decision email's recipients (admin only, used by the review Server Action);
--   · blog managers may upload post images under posts/{post_id}/ for their own blog's posts;
--   · a translation of a post must stay within the same kind and blog;
--   · manager changes are written to audit_log.

-- ── Co-managers ───────────────────────────────────────────────────────────────
-- Accounts are not readable by other registered users, so owners can't look up a user id
-- themselves. This adds a confirmed, active account as a manager of a profile the caller owns.
create function public.add_profile_manager(profile uuid, email text, manager_role text default 'editor')
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  target uuid;
begin
  if not (private.owns_profile(profile) or private.has_role('admin')) then
    raise exception 'Only an owner of this profile can add managers' using errcode = '42501';
  end if;
  if manager_role not in ('owner', 'editor') then
    raise exception 'Unknown manager role %', manager_role using errcode = '22023';
  end if;
  select u.id into target
    from auth.users u
    join public.accounts a on a.id = u.id
    where u.email = lower(btrim(add_profile_manager.email))
      and u.email_confirmed_at is not null
      and a.deactivated_at is null
      and a.deletion_requested_at is null;
  if target is null then
    raise exception 'No active account uses this email' using errcode = 'P0002';
  end if;
  insert into public.profile_managers (profile_id, user_id, role)
  values (profile, target, manager_role)
  on conflict (profile_id, user_id) do nothing;
  if not found then
    raise exception 'This person already manages the profile' using errcode = '23505';
  end if;
  return target;
end;
$$;

-- Managers of a profile with their display names (never their emails), for the people who may see
-- the managers anyway (co-managers and admins; same rule as the profile_managers SELECT policy).
create function public.list_profile_managers(profile uuid)
  returns table (user_id uuid, display_name text, role text, created_at timestamptz)
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (private.manages_profile(profile) or private.has_role('admin')) then
    raise exception 'You do not manage this profile' using errcode = '42501';
  end if;
  return query
    select pm.user_id, a.display_name, pm.role, pm.created_at
    from public.profile_managers pm
    join public.accounts a on a.id = pm.user_id
    where pm.profile_id = profile
    order by pm.role desc, pm.created_at;
end;
$$;

create trigger profile_managers_audit after insert or update or delete on public.profile_managers
  for each row execute function private.audit_row('profile_id');

-- ── Review decisions notify every manager ─────────────────────────────────────
-- Same rules as the phase 2 version; it also writes one in-app notification per manager. The
-- notification payload carries the public note only (internal notes stay in review_event_notes).
create or replace function public.review_profile(profile uuid, decision text, note_public text default null,
                                                 note_internal text default null)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  current_status public.profile_status;
  next_status public.profile_status;
  event_id uuid;
  profile_name text;
  profile_type public.profile_type;
begin
  if not private.has_role('admin') then
    raise exception 'Only an admin can review profiles' using errcode = '42501';
  end if;
  select p.status, p.display_name, p.type into current_status, profile_name, profile_type
    from public.public_profiles p where p.id = profile for update;
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
  values ('profile', profile, decision, (select auth.uid()), nullif(btrim(note_public), ''))
  returning id into event_id;
  if nullif(btrim(note_internal), '') is not null then
    insert into public.review_event_notes (review_event_id, note_internal) values (event_id, note_internal);
  end if;
  insert into public.notifications (user_id, kind, payload)
  select pm.user_id, 'profile_review',
         jsonb_build_object('profile_id', profile, 'profile_type', profile_type, 'display_name', profile_name,
                            'decision', decision, 'note_public', nullif(btrim(note_public), ''))
    from public.profile_managers pm
    where pm.profile_id = profile;
end;
$$;

-- Who receives the decision email: every manager of the profile, in their preferred locale. Admin
-- only; the review Server Action calls it right after review_profile() (no service-role key needed).
create function public.profile_review_recipients(profile uuid)
  returns table (email text, locale public.locale, display_name text)
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception 'Only an admin can read review recipients' using errcode = '42501';
  end if;
  return query
    select u.email::text, a.preferred_locale, a.display_name
    from public.profile_managers pm
    join public.accounts a on a.id = pm.user_id
    join auth.users u on u.id = pm.user_id
    where pm.profile_id = profile
      and u.email is not null
      and a.deactivated_at is null
      and a.deletion_requested_at is null;
end;
$$;

-- ── Post images for blog managers ─────────────────────────────────────────────
-- posts/{post_id}/…: the board for any post (news), and managers of an approved blog for the posts
-- of that blog. Everything else is unchanged from the storage migration.
create or replace function private.can_write_public_media(object_name text) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select case (storage.foldername(object_name))[1]
    when 'profiles' then private.manages_profile(private.try_uuid((storage.foldername(object_name))[2]))
                         or private.has_role('admin')
    when 'posts' then private.has_role('board') or exists (
                        select 1 from public.posts p
                        where p.id = private.try_uuid((storage.foldername(object_name))[2])
                          and p.kind = 'blog'
                          and private.can_write_blog(p.blog_profile_id))
    when 'events' then private.has_role('board')
    when 'site' then private.has_role('admin')
    else false
  end
$$;

-- ── Translations stay within their blog ───────────────────────────────────────
-- A post joins an existing translation group only if every post already in it has the same kind
-- and blog. Without this, a blog manager could attach a post to an ACF news group (or another
-- blog's) and appear as its hreflang alternate.
create function private.check_post_translation_group() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.posts p
    where p.translation_group = new.translation_group
      and p.id <> new.id
      and (p.kind <> new.kind or p.blog_profile_id is distinct from new.blog_profile_id)
  ) then
    raise exception 'A translation must belong to the same blog as the original' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger posts_translation_group before insert or update of translation_group, kind, blog_profile_id
  on public.posts
  for each row execute function private.check_post_translation_group();

-- ── Grants ────────────────────────────────────────────────────────────────────
-- New functions are executable by PUBLIC by default; close them, then open them to signed-in users
-- (each one re-checks the caller). anon must never execute a public function (001-structure).
revoke all on function public.add_profile_manager(uuid, text, text),
  public.list_profile_managers(uuid),
  public.profile_review_recipients(uuid)
  from public, anon, authenticated;
grant execute on function public.add_profile_manager(uuid, text, text),
  public.list_profile_managers(uuid),
  public.profile_review_recipients(uuid)
  to authenticated, service_role;
revoke all on function private.check_post_translation_group() from public, anon, authenticated;

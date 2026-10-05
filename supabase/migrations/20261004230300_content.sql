-- Public content: ACF news, blog posts, events and their line-ups (docs/roles.md §1).
-- Publishing and unpublishing go through SECURITY DEFINER functions (audited); the `status`
-- columns are not granted for direct updates.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  kind public.post_kind not null,
  blog_profile_id uuid references public.public_profiles (id) on delete cascade,
  author_id uuid references public.accounts (id) on delete set null,
  locale public.locale not null,
  translation_group uuid not null default gen_random_uuid(),
  slug extensions.citext not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 200),
  excerpt text,
  body_md text not null default '',
  cover_path text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'blog') = (blog_profile_id is not null)),
  unique nulls not distinct (kind, blog_profile_id, locale, slug),
  unique (translation_group, locale)
);
create index posts_published_idx on public.posts (kind, locale, published_at desc) where status = 'published';
create index posts_blog_profile_idx on public.posts (blog_profile_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title jsonb not null check (title ?| array['ar', 'fr', 'en']),
  description jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  venue_profile_id uuid references public.public_profiles (id) on delete set null,
  venue_text text,
  governorate_code text references public.governorates (code),
  cover_path text,
  ticket_url text check (ticket_url is null or ticket_url ~ '^https?://'),
  is_free boolean not null default false,
  organized_by_acf boolean not null default false,
  status public.content_status not null default 'draft',
  proposed_by uuid references public.accounts (id) on delete set null,
  published_by uuid references public.accounts (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', private.immutable_unaccent(private.locale_map_text(title) || ' ' || coalesce(venue_text, '')))
  ) stored
);
create index events_published_idx on public.events (starts_at) where status = 'published';
create index events_venue_idx on public.events (venue_profile_id);
create index events_proposed_by_idx on public.events (proposed_by);
create index events_search_idx on public.events using gin (search);

create table public.event_lineup (
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.public_profiles (id) on delete cascade,
  role text,
  position smallint not null default 0,
  primary key (event_id, profile_id)
);
create index event_lineup_profile_idx on public.event_lineup (profile_id);

create trigger posts_updated_at before update on public.posts
  for each row execute function private.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function private.set_updated_at();
create trigger posts_status_audit after update of status on public.posts
  for each row when (old.status is distinct from new.status) execute function private.audit_row();
create trigger events_status_audit after update of status on public.events
  for each row when (old.status is distinct from new.status) execute function private.audit_row();

-- Authors and proposers come from the session, never from the request body.
create function private.stamp_post_author() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.author_id := (select auth.uid());
  end if;
  return new;
end;
$$;
create trigger posts_stamp_author before insert on public.posts
  for each row execute function private.stamp_post_author();

-- ── Helpers ───────────────────────────────────────────────────────────────────
-- Blog posts may be written only under an *approved* blog profile the caller manages.
create function private.can_write_blog(blog uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select private.manages_approved_profile(blog, array['blog']::public.profile_type[]) $$;

create function private.is_event_proposer(event uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.events e where e.id = event and e.proposed_by = (select auth.uid())
  )
$$;

create function private.is_pending_proposal_of_caller(event uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.events e
    where e.id = event and e.proposed_by = (select auth.uid()) and e.status = 'pending'
  )
$$;

create function private.is_post_author(post uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.posts p where p.id = post and p.author_id = (select auth.uid())) $$;

grant execute on function private.can_write_blog(uuid), private.is_event_proposer(uuid),
  private.is_pending_proposal_of_caller(uuid), private.is_post_author(uuid)
  to anon, authenticated, service_role;

-- ── RPCs ──────────────────────────────────────────────────────────────────────
-- News: board+ publish/unpublish. Blog: managers of the approved blog publish directly (post-hoc
-- moderation); admins may unpublish any blog post.
create function public.set_post_status(post uuid, new_status public.content_status, note_public text default null)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  target record;
  allowed boolean;
begin
  select id, kind, blog_profile_id, status into target from public.posts where id = post for update;
  if target.id is null then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;
  allowed := case target.kind
    when 'news' then private.has_role('board')
    when 'blog' then private.can_write_blog(target.blog_profile_id)
                     or (private.has_role('admin') and new_status in ('unpublished', 'draft'))
  end;
  if not allowed then
    raise exception 'You cannot change the status of this post' using errcode = '42501';
  end if;
  if new_status = 'pending' then
    raise exception 'Posts are published directly; there is no pending state' using errcode = 'P0001';
  end if;
  update public.posts
    set status = new_status,
        published_at = case when new_status = 'published' then coalesce(published_at, now()) else published_at end
    where id = post;
  if new_status in ('published', 'unpublished') then
    insert into public.review_events (target_type, target_id, action, actor_id, note_public)
    values ('post', post, new_status::text, (select auth.uid()), note_public);
  end if;
end;
$$;

-- An approved artist (playing in it) or venue (hosting it) proposes an event; board reviews it.
create function public.propose_event(
  as_profile uuid,
  slug text,
  title jsonb,
  starts_at timestamptz,
  ends_at timestamptz default null,
  description jsonb default '{}'::jsonb,
  venue_profile uuid default null,
  venue_text text default null,
  governorate_code text default null,
  ticket_url text default null,
  is_free boolean default false
) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  proposer_type public.profile_type;
  new_id uuid;
begin
  if not private.manages_approved_profile(as_profile, array['artist', 'venue']::public.profile_type[]) then
    raise exception 'Only managers of an approved artist or venue profile can propose events'
      using errcode = '42501';
  end if;
  select type into proposer_type from public.public_profiles where id = as_profile;
  if proposer_type = 'venue' then
    venue_profile := as_profile;
  end if;
  insert into public.events (slug, title, description, starts_at, ends_at, venue_profile_id, venue_text,
                             governorate_code, ticket_url, is_free, status, proposed_by)
  values (slug, title, description, starts_at, ends_at, venue_profile, venue_text,
          governorate_code, ticket_url, is_free, 'pending', (select auth.uid()))
  returning id into new_id;
  if proposer_type = 'artist' then
    insert into public.event_lineup (event_id, profile_id, position) values (new_id, as_profile, 0);
  end if;
  insert into public.review_events (target_type, target_id, action, actor_id)
  values ('event', new_id, 'submitted', (select auth.uid()));
  return new_id;
end;
$$;

-- Board+ publish, unpublish or send back to draft; a rejected proposal is unpublished with a note.
create function public.set_event_status(event uuid, new_status public.content_status, note_public text default null)
  returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_role('board') then
    raise exception 'Only the board can change the status of events' using errcode = '42501';
  end if;
  update public.events
    set status = new_status,
        published_at = case when new_status = 'published' then coalesce(published_at, now()) else published_at end,
        published_by = case when new_status = 'published' then (select auth.uid()) else published_by end
    where id = event;
  if not found then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if new_status in ('published', 'unpublished') then
    insert into public.review_events (target_type, target_id, action, actor_id, note_public)
    values ('event', event, new_status::text, (select auth.uid()), note_public);
  end if;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.posts enable row level security;
alter table public.events enable row level security;
alter table public.event_lineup enable row level security;

create policy "posts: anyone reads published" on public.posts for select to anon
  using (status = 'published');
-- Signed in: published posts, news drafts for the board, own blog's drafts, everything for admins.
create policy "posts: published or within own remit" on public.posts for select to authenticated
  using (status = 'published'
         or (kind = 'news' and (select private.has_role('board')))
         or (kind = 'blog' and private.manages_profile(blog_profile_id))
         or (select private.has_role('admin')));
create policy "posts: board writes news, blog managers write own blog" on public.posts for insert to authenticated
  with check (status = 'draft' and (
    (kind = 'news' and (select private.has_role('board')))
    or (kind = 'blog' and private.can_write_blog(blog_profile_id))));
create policy "posts: board edits news, blog managers edit own blog" on public.posts for update to authenticated
  using ((kind = 'news' and (select private.has_role('board')))
         or (kind = 'blog' and private.can_write_blog(blog_profile_id)))
  with check ((kind = 'news' and (select private.has_role('board')))
              or (kind = 'blog' and private.can_write_blog(blog_profile_id)));
create policy "posts: delete by owner role or admin" on public.posts for delete to authenticated
  using ((kind = 'news' and (select private.has_role('board')))
         or (kind = 'blog' and private.can_write_blog(blog_profile_id))
         or (select private.has_role('admin')));

create policy "events: anyone reads published" on public.events for select to anon
  using (status = 'published');
create policy "events: published, own proposals or board" on public.events for select to authenticated
  using (status = 'published' or proposed_by = (select auth.uid()) or (select private.has_role('board')));
-- Board creates events directly (as drafts); proposals go through propose_event().
create policy "events: board creates" on public.events for insert to authenticated
  with check ((select private.has_role('board')) and status = 'draft');
create policy "events: board edits, proposers edit pending" on public.events for update to authenticated
  using ((select private.has_role('board')) or (proposed_by = (select auth.uid()) and status = 'pending'))
  with check ((select private.has_role('board')) or (proposed_by = (select auth.uid()) and status = 'pending'));
create policy "events: board deletes" on public.events for delete to authenticated
  using ((select private.has_role('board')));

create policy "event_lineup: visible with event" on public.event_lineup for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "event_lineup: board or pending proposer writes (insert)" on public.event_lineup for insert to authenticated
  with check ((select private.has_role('board')) or private.is_pending_proposal_of_caller(event_id));
create policy "event_lineup: board or pending proposer writes (update)" on public.event_lineup for update to authenticated
  using ((select private.has_role('board')) or private.is_pending_proposal_of_caller(event_id)) with check ((select private.has_role('board')) or private.is_pending_proposal_of_caller(event_id));
create policy "event_lineup: board or pending proposer writes (delete)" on public.event_lineup for delete to authenticated
  using ((select private.has_role('board')) or private.is_pending_proposal_of_caller(event_id));

-- Review history for events (proposer) and posts (author).
drop policy "review_events: admin or concerned managers read" on public.review_events;
create policy "review_events: admin, board or concerned people read" on public.review_events for select to authenticated
  using ((select private.has_role('admin'))
         or (target_type = 'profile' and private.manages_profile(target_id))
         or (target_type = 'event' and private.is_event_proposer(target_id))
         or (target_type = 'post' and private.is_post_author(target_id))
         or (target_type in ('event', 'post') and (select private.has_role('board'))));

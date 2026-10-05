-- Member space (hidden): meetings, tasks, announcements, polls, volunteering, document library.
-- docs/roles.md §3. `audience` columns are compared with the caller's role (Guard rail 5).

-- ── Documents (first: meetings reference minutes) ────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  collection public.document_collection not null default 'library',
  audience public.app_role not null default 'member' check (audience in ('member', 'board')),
  title text not null check (char_length(title) between 1 and 200),
  category text,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20 * 1024 * 1024),
  version integer not null default 1 check (version > 0),
  supersedes_id uuid references public.documents (id) on delete set null,
  uploaded_by uuid references public.accounts (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The legal vault is board-only by construction.
  check (collection <> 'legal' or audience = 'board')
);
create index documents_collection_idx on public.documents (collection, audience);

-- ── Meetings ──────────────────────────────────────────────────────────────────
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description_md text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at >= starts_at),
  location_text text,
  online_url text check (online_url is null or online_url ~ '^https?://'),
  audience public.app_role not null default 'member' check (audience in ('member', 'board')),
  minutes_document_id uuid references public.documents (id) on delete set null,
  cancelled_at timestamptz,
  created_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meetings_starts_at_idx on public.meetings (starts_at);

create table public.meeting_rsvps (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references public.accounts (id) on delete cascade,
  response public.rsvp_response not null,
  note text check (note is null or char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);
create index meeting_rsvps_user_idx on public.meeting_rsvps (user_id);

-- ── Projects (tasks reference them; budgets live in the board migration) ──────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  status text not null default 'active' check (status in ('planned', 'active', 'done', 'cancelled')),
  starts_on date,
  ends_on date check (ends_on is null or starts_on is null or ends_on >= starts_on),
  created_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description_md text not null default '',
  status public.task_status not null default 'todo',
  priority smallint not null default 2 check (priority between 1 and 3),
  due_on date,
  project_id uuid references public.projects (id) on delete set null,
  audience public.app_role not null default 'member' check (audience in ('member', 'board')),
  is_open boolean not null default false,
  created_by uuid references public.accounts (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_status_idx on public.tasks (status, due_on);

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.accounts (id) on delete cascade,
  assigned_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index task_assignees_user_idx on public.task_assignees (user_id);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid references public.accounts (id) on delete set null,
  body_md text not null check (char_length(body_md) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- ── Announcements ─────────────────────────────────────────────────────────────
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'board' check (source in ('board', 'discord')),
  audience public.app_role not null default 'member' check (audience in ('member', 'board')),
  title text,
  body_md text not null,
  author_id uuid references public.accounts (id) on delete set null,
  author_display text,
  discord_message_id text unique,
  discord_posted_message_id text,
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  edited_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  check (source <> 'discord' or discord_message_id is not null)
);
create index announcements_feed_idx on public.announcements (published_at desc) where hidden_at is null;

-- ── Polls ─────────────────────────────────────────────────────────────────────
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description_md text not null default '',
  kind text not null default 'availability' check (kind in ('availability', 'choice')),
  multi boolean not null default true,
  audience public.app_role not null default 'member' check (audience in ('member', 'board')),
  closes_at timestamptz,
  created_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  position smallint not null default 0
);
create index poll_options_poll_idx on public.poll_options (poll_id, position);

create table public.poll_votes (
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null references public.accounts (id) on delete cascade,
  value public.poll_vote_value not null default 'yes',
  updated_at timestamptz not null default now(),
  primary key (option_id, user_id)
);
create index poll_votes_user_idx on public.poll_votes (user_id);

-- ── Volunteering ──────────────────────────────────────────────────────────────
create table public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  role_label jsonb not null check (role_label ?| array['ar', 'fr', 'en']),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);
create index volunteer_shifts_event_idx on public.volunteer_shifts (event_id);

create table public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.volunteer_shifts (id) on delete cascade,
  user_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (shift_id, user_id)
);
create index volunteer_signups_user_idx on public.volunteer_signups (user_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────
create trigger documents_updated_at before update on public.documents for each row execute function private.set_updated_at();
create trigger meetings_updated_at before update on public.meetings for each row execute function private.set_updated_at();
create trigger meeting_rsvps_updated_at before update on public.meeting_rsvps for each row execute function private.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function private.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function private.set_updated_at();
create trigger task_comments_updated_at before update on public.task_comments for each row execute function private.set_updated_at();
create trigger poll_votes_updated_at before update on public.poll_votes for each row execute function private.set_updated_at();
create trigger documents_audit after insert or update or delete on public.documents
  for each row execute function private.audit_row();

-- Creator / uploader / author columns come from the session.
create function private.stamp_created_by() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create function private.stamp_uploaded_by() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.uploaded_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create function private.stamp_assigned_by() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.assigned_by := (select auth.uid());
  end if;
  return new;
end;
$$;
create function private.stamp_announcement_author() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.author_id := (select auth.uid());
    new.source := 'board';
  end if;
  return new;
end;
$$;
create trigger meetings_stamp before insert on public.meetings for each row execute function private.stamp_created_by();
create trigger projects_stamp before insert on public.projects for each row execute function private.stamp_created_by();
create trigger tasks_stamp before insert on public.tasks for each row execute function private.stamp_created_by();
create trigger polls_stamp before insert on public.polls for each row execute function private.stamp_created_by();
create trigger documents_stamp before insert on public.documents for each row execute function private.stamp_uploaded_by();
create trigger task_assignees_stamp before insert on public.task_assignees for each row execute function private.stamp_assigned_by();
create trigger announcements_stamp before insert on public.announcements for each row execute function private.stamp_announcement_author();

create function private.stamp_comment_author() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.author_id := (select auth.uid());
  end if;
  return new;
end;
$$;
create trigger task_comments_stamp before insert on public.task_comments for each row execute function private.stamp_comment_author();

create function private.task_completed_at() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;
create trigger tasks_completed_at before insert or update of status on public.tasks
  for each row execute function private.task_completed_at();

-- Volunteer capacity: the shift row is locked, so concurrent sign-ups are serialized and the
-- capacity can't be overbooked (Guard rail, roadmap phase 2).
create function private.enforce_shift_capacity() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  shift_capacity integer;
  taken integer;
begin
  select capacity into shift_capacity from public.volunteer_shifts where id = new.shift_id for update;
  select count(*) into taken from public.volunteer_signups where shift_id = new.shift_id;
  if taken >= shift_capacity then
    raise exception 'This shift is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger volunteer_signups_capacity before insert on public.volunteer_signups
  for each row execute function private.enforce_shift_capacity();

-- ── Helpers ───────────────────────────────────────────────────────────────────
create function private.is_task_assignee(task uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select private.has_role('member') and exists (
    select 1 from public.task_assignees ta where ta.task_id = task and ta.user_id = (select auth.uid())
  )
$$;

-- Readable by audience, or assigned to the caller.
create function private.can_read_task(task uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.tasks t where t.id = task and private.has_role(t.audience))
      or private.is_task_assignee(task)
$$;

create function private.can_read_poll(poll uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.polls p where p.id = poll and private.has_role(p.audience)) $$;

create function private.poll_option_is_open(option uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.poll_options o join public.polls p on p.id = o.poll_id
    where o.id = option and private.has_role(p.audience) and (p.closes_at is null or p.closes_at > now())
  )
$$;

create function private.can_read_meeting(meeting uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.meetings m where m.id = meeting and private.has_role(m.audience)) $$;

grant execute on function private.is_task_assignee(uuid), private.can_read_task(uuid),
  private.can_read_poll(uuid), private.poll_option_is_open(uuid), private.can_read_meeting(uuid)
  to anon, authenticated, service_role;

-- ── RPCs ──────────────────────────────────────────────────────────────────────
-- Assignees (and the board) move a task's status; only the board edits everything else.
create function public.set_task_status(task uuid, new_status public.task_status) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not (private.has_role('board') or private.is_task_assignee(task)) then
    raise exception 'Only assignees and the board can change this task' using errcode = '42501';
  end if;
  update public.tasks set status = new_status where id = task;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
end;
$$;

-- RSVP counts for a meeting the caller can see (members see counts, the board sees the list).
create function public.meeting_rsvp_counts(meeting uuid)
  returns table (response public.rsvp_response, total bigint)
  language sql stable security definer set search_path = ''
as $$
  select r.response, count(*)
  from public.meeting_rsvps r
  where r.meeting_id = meeting and private.can_read_meeting(meeting)
  group by r.response
$$;

-- Places taken on each shift of an event (members see counts; the board sees who).
create function public.volunteer_shift_counts(event uuid)
  returns table (shift_id uuid, taken bigint, capacity integer)
  language sql stable security definer set search_path = ''
as $$
  select s.id, count(v.id), s.capacity
  from public.volunteer_shifts s
  left join public.volunteer_signups v on v.shift_id = s.id
  where s.event_id = event and private.has_role('member')
  group by s.id, s.capacity
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.documents enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_rsvps enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_comments enable row level security;
alter table public.announcements enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.volunteer_shifts enable row level security;
alter table public.volunteer_signups enable row level security;

-- Documents: library by audience (legal ⇒ board, check constraint). Board writes the library and
-- the legal vault; only admins delete legal documents (roles.md §3–4).
create policy "documents: read by audience" on public.documents for select to authenticated
  using (private.has_role(audience));
create policy "documents: board creates" on public.documents for insert to authenticated
  with check ((select private.has_role('board')));
create policy "documents: board updates" on public.documents for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "documents: board deletes library, admin deletes legal" on public.documents for delete to authenticated
  using ((collection = 'library' and (select private.has_role('board'))) or (select private.has_role('admin')));

create policy "meetings: read by audience" on public.meetings for select to authenticated
  using (private.has_role(audience));
create policy "meetings: board manages (insert)" on public.meetings for insert to authenticated
  with check ((select private.has_role('board')));
create policy "meetings: board manages (update)" on public.meetings for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "meetings: board manages (delete)" on public.meetings for delete to authenticated
  using ((select private.has_role('board')));

create policy "meeting_rsvps: own or board reads" on public.meeting_rsvps for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('board')));
create policy "meeting_rsvps: members answer for themselves" on public.meeting_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_read_meeting(meeting_id));
create policy "meeting_rsvps: members update own answer" on public.meeting_rsvps for update to authenticated
  using (user_id = (select auth.uid()) and private.can_read_meeting(meeting_id))
  with check (user_id = (select auth.uid()) and private.can_read_meeting(meeting_id));

-- Projects: members read names for task context; the board manages them.
create policy "projects: members read" on public.projects for select to authenticated
  using ((select private.has_role('member')));
create policy "projects: board manages (insert)" on public.projects for insert to authenticated
  with check ((select private.has_role('board')));
create policy "projects: board manages (update)" on public.projects for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "projects: board manages (delete)" on public.projects for delete to authenticated
  using ((select private.has_role('board')));

create policy "tasks: read by audience or assignment" on public.tasks for select to authenticated
  using (private.has_role(audience) or private.is_task_assignee(id));
create policy "tasks: board manages (insert)" on public.tasks for insert to authenticated
  with check ((select private.has_role('board')));
create policy "tasks: board manages (update)" on public.tasks for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "tasks: board manages (delete)" on public.tasks for delete to authenticated
  using ((select private.has_role('board')));

create policy "task_assignees: visible with task" on public.task_assignees for select to authenticated
  using (private.can_read_task(task_id));
-- Members self-assign open tasks they can see; the board assigns anyone.
create policy "task_assignees: self-assign open tasks or board assigns" on public.task_assignees for insert to authenticated
  with check ((select private.has_role('board'))
              or (user_id = (select auth.uid())
                  and exists (select 1 from public.tasks t
                              where t.id = task_id and t.is_open and private.has_role(t.audience)
                                and t.status not in ('done', 'cancelled'))));
create policy "task_assignees: self-unassign or board" on public.task_assignees for delete to authenticated
  using ((select private.has_role('board')) or (user_id = (select auth.uid()) and (select private.has_role('member'))));

create policy "task_comments: visible with task" on public.task_comments for select to authenticated
  using (private.can_read_task(task_id));
create policy "task_comments: members comment on readable tasks" on public.task_comments for insert to authenticated
  with check ((select private.has_role('member')) and private.can_read_task(task_id));
create policy "task_comments: authors edit own" on public.task_comments for update to authenticated
  using (author_id = (select auth.uid()) and (select private.has_role('member')))
  with check (author_id = (select auth.uid()));
create policy "task_comments: authors or board delete" on public.task_comments for delete to authenticated
  using ((author_id = (select auth.uid()) and (select private.has_role('member'))) or (select private.has_role('board')));

-- Announcements: members read their audience's non-hidden items; the board manages (and hides
-- Discord-synced ones). Discord items are inserted by the sync job (service role).
create policy "announcements: read by audience" on public.announcements for select to authenticated
  using ((private.has_role(audience) and hidden_at is null) or (select private.has_role('board')));
create policy "announcements: board manages (insert)" on public.announcements for insert to authenticated
  with check ((select private.has_role('board')));
create policy "announcements: board manages (update)" on public.announcements for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "announcements: board manages (delete)" on public.announcements for delete to authenticated
  using ((select private.has_role('board')));

create policy "polls: read by audience" on public.polls for select to authenticated
  using (private.has_role(audience));
create policy "polls: board manages (insert)" on public.polls for insert to authenticated
  with check ((select private.has_role('board')));
create policy "polls: board manages (update)" on public.polls for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "polls: board manages (delete)" on public.polls for delete to authenticated
  using ((select private.has_role('board')));
create policy "poll_options: visible with poll" on public.poll_options for select to authenticated
  using (private.can_read_poll(poll_id));
create policy "poll_options: board manages (insert)" on public.poll_options for insert to authenticated
  with check ((select private.has_role('board')));
create policy "poll_options: board manages (update)" on public.poll_options for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "poll_options: board manages (delete)" on public.poll_options for delete to authenticated
  using ((select private.has_role('board')));

-- Votes: results are visible to everyone who sees the poll; own votes only while it's open.
create policy "poll_votes: visible with poll" on public.poll_votes for select to authenticated
  using (exists (select 1 from public.poll_options o where o.id = option_id and private.can_read_poll(o.poll_id)));
create policy "poll_votes: vote while open" on public.poll_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and private.poll_option_is_open(option_id));
create policy "poll_votes: change own vote while open" on public.poll_votes for update to authenticated
  using (user_id = (select auth.uid()) and private.poll_option_is_open(option_id))
  with check (user_id = (select auth.uid()) and private.poll_option_is_open(option_id));
create policy "poll_votes: withdraw own vote while open" on public.poll_votes for delete to authenticated
  using (user_id = (select auth.uid()) and private.poll_option_is_open(option_id));

create policy "volunteer_shifts: members read" on public.volunteer_shifts for select to authenticated
  using ((select private.has_role('member')));
create policy "volunteer_shifts: board manages (insert)" on public.volunteer_shifts for insert to authenticated
  with check ((select private.has_role('board')));
create policy "volunteer_shifts: board manages (update)" on public.volunteer_shifts for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "volunteer_shifts: board manages (delete)" on public.volunteer_shifts for delete to authenticated
  using ((select private.has_role('board')));

create policy "volunteer_signups: own or board reads" on public.volunteer_signups for select to authenticated
  using ((user_id = (select auth.uid()) and (select private.has_role('member'))) or (select private.has_role('board')));
create policy "volunteer_signups: members sign themselves up" on public.volunteer_signups for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.has_role('member')));
create policy "volunteer_signups: members cancel own, board removes" on public.volunteer_signups for delete to authenticated
  using ((user_id = (select auth.uid()) and (select private.has_role('member'))) or (select private.has_role('board')));

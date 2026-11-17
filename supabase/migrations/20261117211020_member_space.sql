-- Phase 5: member space (docs/roadmap.md → Phase 5, docs/roles.md §3). The tables, policies and the
-- task, RSVP-count and shift-count RPCs exist since phase 2; this migration adds what the member
-- screens need on top of them:
--   · in-app notifications for new board announcements, task assignments, new meetings and
--     cancelled meetings;
--   · answer_meeting() and set_poll_votes(): one-call answers that run as the caller, so RLS decides
--     (a PostgREST upsert also SETs the key columns, which the column grants rightly don't allow);
--   · volunteer_shift_overview(): upcoming shifts with places taken and the caller's own sign-up;
--   · member-documents objects are linked to their documents row by path, so the board uploads the
--     file first and records it afterwards (the same flow as public media, D-067).

-- ── Notifications ─────────────────────────────────────────────────────────────
-- Rows written without a session (seed, imports, the Discord sync job) notify nobody: only people
-- acting in the app do, and never about their own action.

-- Active members whose role reaches `audience`, on accounts that are not deactivated (Guard rail 6).
create function private.audience_members(audience public.app_role) returns setof uuid
  language sql stable set search_path = ''
as $$
  select m.user_id
  from public.memberships m
  join public.accounts a on a.id = m.user_id
  where m.status = 'active'
    and a.deactivated_at is null
    and private.role_rank(m.role) >= private.role_rank(audience)
$$;

create function private.notify_announcement() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or new.source <> 'board' or new.hidden_at is not null then
    return null;
  end if;
  insert into public.notifications (user_id, kind, payload)
  select member, 'announcement_published',
         jsonb_build_object('announcement_id', new.id, 'title', new.title, 'audience', new.audience)
    from private.audience_members(new.audience) as member
    where member <> actor;
  return null;
end;
$$;
create trigger announcements_notify after insert on public.announcements
  for each row execute function private.notify_announcement();

-- The board assigning someone (self-assignment notifies nobody).
create function private.notify_task_assignment() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or actor = new.user_id then
    return null;
  end if;
  insert into public.notifications (user_id, kind, payload)
  select new.user_id, 'task_assigned', jsonb_build_object('task_id', t.id, 'title', t.title)
    from public.tasks t
    where t.id = new.task_id;
  return null;
end;
$$;
create trigger task_assignees_notify after insert on public.task_assignees
  for each row execute function private.notify_task_assignment();

-- A new meeting, or a meeting that gets cancelled, tells its whole audience.
create function private.notify_meeting() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  notice_kind text;
begin
  if actor is null then
    return null;
  end if;
  if tg_op = 'INSERT' and new.cancelled_at is null then
    notice_kind := 'meeting_scheduled';
  elsif tg_op = 'UPDATE' and old.cancelled_at is null and new.cancelled_at is not null then
    notice_kind := 'meeting_cancelled';
  else
    return null;
  end if;
  insert into public.notifications (user_id, kind, payload)
  select member, notice_kind,
         jsonb_build_object('meeting_id', new.id, 'title', new.title, 'starts_at', new.starts_at)
    from private.audience_members(new.audience) as member
    where member <> actor;
  return null;
end;
$$;
create trigger meetings_notify after insert or update of cancelled_at on public.meetings
  for each row execute function private.notify_meeting();

-- ── Meeting answers ───────────────────────────────────────────────────────────
-- Answer (or change an answer) in one call. Runs as the caller: the meeting_rsvps policies decide
-- who may answer which meeting. Cancelled and finished meetings no longer take answers.
create function public.answer_meeting(meeting uuid, answer public.rsvp_response, answer_note text default null)
  returns void
  language plpgsql security invoker set search_path = ''
as $$
declare
  target record;
begin
  select m.cancelled_at, coalesce(m.ends_at, m.starts_at) as ends_at into target
    from public.meetings m
    where m.id = meeting;
  if not found then
    raise exception 'Meeting not found' using errcode = 'P0002';
  end if;
  if target.cancelled_at is not null or target.ends_at < now() then
    raise exception 'This meeting no longer takes answers' using errcode = 'P0001';
  end if;
  insert into public.meeting_rsvps (meeting_id, user_id, response, note)
  values (meeting, (select auth.uid()), answer, nullif(btrim(answer_note), ''))
  on conflict (meeting_id, user_id) do update set response = excluded.response, note = excluded.note;
end;
$$;

-- ── Poll votes ────────────────────────────────────────────────────────────────
-- A member's answers to every option of a poll in one call, as the caller (the poll_votes policies:
-- own votes, polls in their audience, only while the poll is open). `votes` maps option ids to
-- yes/maybe/no; options left out are withdrawn.
create function public.set_poll_votes(poll uuid, votes jsonb)
  returns void
  language plpgsql security invoker set search_path = ''
as $$
declare
  poll_option uuid;
  choice text;
begin
  if jsonb_typeof(votes) is distinct from 'object' then
    raise exception 'Votes must map option ids to answers' using errcode = '22023';
  end if;
  if not exists (select 1 from public.polls p where p.id = poll) then
    raise exception 'Poll not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.polls p where p.id = poll and p.closes_at <= now()) then
    raise exception 'This poll is closed' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_object_keys(votes) as k (key)
             where not exists (select 1 from public.poll_options o
                               where o.poll_id = poll and o.id::text = k.key)) then
    raise exception 'Unknown option for this poll' using errcode = '22023';
  end if;
  for poll_option in select o.id from public.poll_options o where o.poll_id = poll loop
    choice := votes ->> poll_option::text;
    if choice is null then
      delete from public.poll_votes v where v.option_id = poll_option and v.user_id = (select auth.uid());
    else
      insert into public.poll_votes (option_id, user_id, value)
      values (poll_option, (select auth.uid()), choice::public.poll_vote_value)
      on conflict on constraint poll_votes_pkey do update set value = excluded.value;
    end if;
  end loop;
end;
$$;

-- ── Volunteer shifts ──────────────────────────────────────────────────────────
-- Upcoming shifts with the places taken and whether the caller signed up. Members see counts; the
-- board also sees who signed up, through volunteer_signups.
create function public.volunteer_shift_overview()
  returns table (shift_id uuid, event_id uuid, role_label jsonb, starts_at timestamptz,
                 ends_at timestamptz, capacity integer, taken bigint, signed_up boolean)
  language sql stable security definer set search_path = ''
as $$
  select s.id, s.event_id, s.role_label, s.starts_at, s.ends_at, s.capacity, count(v.id),
         coalesce(bool_or(v.user_id = (select auth.uid())), false)
  from public.volunteer_shifts s
  left join public.volunteer_signups v on v.shift_id = s.id
  where private.has_role('member') and s.ends_at > now()
  group by s.id
  order by s.starts_at, s.id
$$;

-- ── Library files ─────────────────────────────────────────────────────────────
-- A member-documents object is readable when the library document that points to it is (audience
-- check). Matching on the stored path (unique) lets the board upload a file before its row exists.
create or replace function private.can_read_member_document(object_name text) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.storage_path = object_name
      and d.collection = 'library'
      and private.has_role(d.audience)
  )
$$;

-- ── Grants ────────────────────────────────────────────────────────────────────
-- New functions are executable by PUBLIC by default; close them, then open the RPCs to signed-in
-- users (each one re-checks the caller or runs under RLS). anon executes nothing (001-structure).
revoke all on function public.answer_meeting(uuid, public.rsvp_response, text),
  public.set_poll_votes(uuid, jsonb),
  public.volunteer_shift_overview()
  from public, anon, authenticated;
grant execute on function public.answer_meeting(uuid, public.rsvp_response, text),
  public.set_poll_votes(uuid, jsonb),
  public.volunteer_shift_overview()
  to authenticated, service_role;
revoke all on function private.audience_members(public.app_role),
  private.notify_announcement(),
  private.notify_task_assignment(),
  private.notify_meeting()
  from public, anon, authenticated;

-- Phase 5 member space (docs/roles.md §3, 20261117211020_member_space): in-app notifications for
-- announcements, task assignments and meetings; meeting answers and poll votes in one call (under
-- RLS, votes locked once a poll closes); the volunteer shift overview.
begin;
select no_plan();
select tests.setup();

-- ── Notifications: announcements ──
select tests.as('board');
select lives_ok($$with a as (insert into public.announcements (title, body_md) values ('Répétition fictive', 'Texte') returning id)
                  select tests.remember('announcement_new', id) from a$$,
  'the board posts a member announcement');
select lives_ok($$with a as (insert into public.announcements (title, body_md, audience) values ('Bureau fictif', 'Texte', 'board') returning id)
                  select tests.remember('announcement_new_board', id) from a$$,
  'the board posts a board announcement');
select tests.as_superuser();
select is((select count(*)::int from public.notifications where kind = 'announcement_published'
             and payload ->> 'announcement_id' = tests.id('announcement_new')::text), 2,
  'a member announcement notifies the other active members (member and admin)');
select ok(exists (select 1 from public.notifications where user_id = tests.id('member') and kind = 'announcement_published'
                    and payload ->> 'title' = 'Répétition fictive'), 'the notification carries the title');
select ok(not exists (select 1 from public.notifications where kind = 'announcement_published'
                        and user_id in (tests.id('board'), tests.id('registered'), tests.id('suspended'), tests.id('deactivated'))
                        and payload ->> 'announcement_id' = tests.id('announcement_new')::text),
  'the author and people without an active role are not notified');
select is((select count(*)::int from public.notifications where kind = 'announcement_published'
             and payload ->> 'announcement_id' = tests.id('announcement_new_board')::text and user_id = tests.id('admin')), 1,
  'a board announcement reaches the admin');
select ok(not exists (select 1 from public.notifications where kind = 'announcement_published' and user_id = tests.id('member')
                        and payload ->> 'announcement_id' = tests.id('announcement_new_board')::text),
  'a board announcement never reaches members');
insert into public.announcements (audience, title, body_md) values ('member', 'Import fictif', 'Texte');
select is((select count(*)::int from public.notifications where payload ->> 'title' = 'Import fictif'), 0,
  'rows written without a session (seed, Discord sync) notify nobody');

-- ── Notifications: task assignments ──
select tests.as('board');
select lives_ok($$insert into public.task_assignees (task_id, user_id) values (tests.id('task_member'), tests.id('member'))$$,
  'the board assigns a member');
select tests.as('member');
select lives_ok($$insert into public.task_assignees (task_id, user_id) values (tests.id('task_open'), tests.id('member'))$$,
  'a member takes an open task');
select is((select payload ->> 'title' from public.notifications where kind = 'task_assigned'
             and payload ->> 'task_id' = tests.id('task_member')::text), 'Tâche membres',
  'the assignee is notified and reads the notification');
select is(tests.rows($$select 1 from public.notifications where kind = 'task_assigned' and payload ->> 'task_id' = tests.id('task_open')::text$$), 0,
  'taking a task yourself notifies nobody');

-- ── Notifications: meetings ──
select tests.as('board');
select lives_ok($$with m as (insert into public.meetings (title, starts_at) values ('Assemblée nouvelle', now() + interval '9 days') returning id)
                  select tests.remember('meeting_new', id) from m$$,
  'the board schedules a member meeting');
select lives_ok($$with m as (insert into public.meetings (title, starts_at, audience) values ('Bureau nouveau', now() + interval '9 days', 'board') returning id)
                  select tests.remember('meeting_new_board', id) from m$$,
  'the board schedules a board meeting');
select is(tests.affected($$update public.meetings set cancelled_at = now() where id = tests.id('meeting_new')$$), 1,
  'the board cancels the member meeting');
select tests.as_superuser();
select is((select count(*)::int from public.notifications where kind = 'meeting_scheduled'
             and payload ->> 'meeting_id' = tests.id('meeting_new')::text), 2,
  'a new member meeting notifies the other active members');
select is((select count(*)::int from public.notifications where kind = 'meeting_cancelled'
             and payload ->> 'meeting_id' = tests.id('meeting_new')::text), 2,
  'cancelling it notifies them again');
select ok(not exists (select 1 from public.notifications where user_id = tests.id('board')
                        and payload ->> 'meeting_id' = tests.id('meeting_new')::text),
  'the board member who acted is not notified');
select ok(not exists (select 1 from public.notifications where user_id = tests.id('member')
                        and payload ->> 'meeting_id' = tests.id('meeting_new_board')::text),
  'a board meeting never reaches members');
select tests.as('member');
select is(tests.rows($$select 1 from public.notifications where kind like 'meeting_%' and user_id <> tests.id('member')$$), 0,
  'members read only their own notifications');

-- ── Meeting answers ──
select tests.as_superuser();
insert into public.meetings (id, title, starts_at, cancelled_at) values
  (tests.remember('meeting_cancelled', gen_random_uuid()), 'Annulée fictive', now() + interval '6 days', now());
insert into public.meetings (id, title, starts_at) values
  (tests.remember('meeting_past', gen_random_uuid()), 'Passée fictive', now() - interval '2 days');
select tests.as('member');
select lives_ok($$select public.answer_meeting(tests.id('meeting_member'), 'maybe')$$, 'a member answers a meeting');
select lives_ok($$select public.answer_meeting(tests.id('meeting_member'), 'no', '  Absent ce jour-là  ')$$, 'and changes the answer');
select is((select response::text || '|' || note from public.meeting_rsvps
             where meeting_id = tests.id('meeting_member') and user_id = tests.id('member')),
  'no|Absent ce jour-là', 'one answer per member, with the trimmed note');
select is((select sum(total)::int from public.meeting_rsvp_counts(tests.id('meeting_member'))), 2, 'the counts include the answer');
select throws_ok($$select public.answer_meeting(tests.id('meeting_board'), 'yes')$$, 'P0002', null,
  'members cannot answer meetings outside their audience');
select throws_ok($$select public.answer_meeting(tests.id('meeting_cancelled'), 'yes')$$, 'P0001', null,
  'cancelled meetings take no answers');
select throws_ok($$select public.answer_meeting(tests.id('meeting_past'), 'yes')$$, 'P0001', null,
  'finished meetings take no answers');
select tests.as('registered');
select throws_ok($$select public.answer_meeting(tests.id('meeting_member'), 'yes')$$, 'P0002', null, 'registered users cannot answer');
select tests.as('anon');
select throws_ok($$select public.answer_meeting(tests.id('meeting_member'), 'yes')$$, '42501', null, 'anon cannot answer');

-- ── Poll votes ──
select tests.as_superuser();
insert into public.poll_options (id, poll_id, label, position) values
  (tests.remember('option_member_2', gen_random_uuid()), tests.id('poll_member'), 'Dimanche', 1);
select tests.as('member');
select lives_ok(format($$select public.set_poll_votes(%L, %L)$$, tests.id('poll_member'),
                       jsonb_build_object(tests.id('option_member'), 'yes', tests.id('option_member_2'), 'maybe')),
  'a member answers every option of a poll at once');
select is((select string_agg(value::text, ',' order by value) from public.poll_votes where user_id = tests.id('member')), 'yes,maybe',
  'one vote per option');
select lives_ok(format($$select public.set_poll_votes(%L, %L)$$, tests.id('poll_member'),
                       jsonb_build_object(tests.id('option_member'), 'no')),
  'a member changes their answers');
select is((select string_agg(value::text, ',') from public.poll_votes where user_id = tests.id('member')), 'no',
  'options left out are withdrawn');
select throws_ok(format($$select public.set_poll_votes(%L, %L)$$, tests.id('poll_closed'),
                        jsonb_build_object(tests.id('option_closed'), 'yes')),
  'P0001', null, 'votes are locked once the poll has closed');
select throws_ok(format($$select public.set_poll_votes(%L, %L)$$, tests.id('poll_board'),
                        jsonb_build_object(tests.id('option_board'), 'yes')),
  'P0002', null, 'members cannot vote in polls outside their audience');
select throws_ok(format($$select public.set_poll_votes(%L, %L)$$, tests.id('poll_member'),
                        jsonb_build_object(tests.id('option_closed'), 'yes')),
  '22023', null, 'options of another poll are refused');
select throws_ok(format($$select public.set_poll_votes(%L, %L)$$, tests.id('poll_member'),
                        jsonb_build_object(tests.id('option_member'), 'perhaps')),
  '22P02', null, 'only yes, maybe and no are answers');
select throws_ok(format($$select public.set_poll_votes(%L, '[]')$$, tests.id('poll_member')),
  '22023', null, 'votes must be an object');
select tests.as('board');
select is(tests.rows(format($$select 1 from public.poll_votes where option_id = %L$$, tests.id('option_member'))), 1,
  'results are visible to the audience');
select tests.as('registered');
select throws_ok(format($$select public.set_poll_votes(%L, '{}')$$, tests.id('poll_member')),
  'P0002', null, 'registered users cannot vote');

-- ── Volunteer shift overview ──
select tests.as('member');
select is((select count(*)::int from public.volunteer_shift_overview()), 2, 'members see the upcoming shifts');
select lives_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift'), tests.id('member'))$$,
  'a member takes the last place of a shift');
select is((select taken::int || '/' || capacity || ':' || signed_up from public.volunteer_shift_overview() where shift_id = tests.id('shift')),
  '1/1:true', 'the overview counts places and marks the caller''s own sign-up');
select tests.as('board');
select is((select signed_up from public.volunteer_shift_overview() where shift_id = tests.id('shift')), false,
  'signed_up is about the caller only');
select throws_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift'), tests.id('board'))$$,
  'P0001', null, 'a full shift refuses more sign-ups');
select tests.as_superuser();
insert into public.volunteer_shifts (event_id, role_label, starts_at, ends_at, capacity)
  values (null, '{"fr":"Passé"}', now() - interval '2 days', now() - interval '1 day', 2);
select tests.as('member');
select is((select count(*)::int from public.volunteer_shift_overview()), 2, 'past shifts drop out of the overview');
select tests.as('registered');
select is((select count(*)::int from public.volunteer_shift_overview()), 0, 'registered users see no shifts');
select tests.as('anon');
select throws_ok($$select * from public.volunteer_shift_overview()$$, '42501', null, 'anon cannot read the overview');

select * from finish();
rollback;

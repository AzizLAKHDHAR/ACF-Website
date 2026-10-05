-- docs/roles.md §3 Member space: registered (denied), member, board, admin; plus suspended and
-- deactivated members, who have no role (Guard rail 6).
begin;
select no_plan();
select tests.setup();

-- ── Directory ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.accounts where id = tests.id('member')$$), 0, 'registered cannot read the member directory');
select tests.as('member');
select ok(tests.rows($$select 1 from public.accounts$$) >= 8, 'members read the directory');
select ok(tests.rows($$select 1 from public.memberships$$) >= 3, 'members see roles in the directory');
select is(tests.rows($$select 1 from public.account_private where account_id = tests.id('board')$$), 0, 'members cannot read contact details');
select tests.as('board');
select is(tests.rows($$select 1 from public.account_private where account_id = tests.id('member')$$), 1, 'board reads contact details');

-- Suspended and deactivated members have no role.
select tests.as('suspended');
select is(tests.rows($$select 1 from public.meetings$$), 0, 'a suspended member sees no meetings');
select is(tests.rows($$select 1 from public.accounts where id <> tests.id('suspended')$$), 0, 'a suspended member has no directory access');
select tests.as('deactivated');
select is(tests.rows($$select 1 from public.meetings$$), 0, 'a deactivated member sees no meetings');
select is(tests.rows($$select 1 from public.documents$$), 0, 'a deactivated member sees no documents');

-- ── Meetings and RSVPs ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.meetings$$), 0, 'registered sees no meetings');
select throws_ok($$insert into public.meeting_rsvps (meeting_id, user_id, response) values (tests.id('meeting_member'), tests.id('registered'), 'yes')$$, '42501', null, 'registered cannot RSVP');
select tests.as('member');
select is(tests.rows($$select 1 from public.meetings where id = tests.id('meeting_member')$$), 1, 'members read member meetings');
select is(tests.rows($$select 1 from public.meetings where id = tests.id('meeting_board')$$), 0, 'members cannot read board meetings');
select throws_ok($$insert into public.meetings (title, starts_at) values ('x', now())$$, '42501', null, 'members cannot create meetings');
select lives_ok($$insert into public.meeting_rsvps (meeting_id, user_id, response) values (tests.id('meeting_member'), tests.id('member'), 'maybe')$$, 'members RSVP for themselves');
select is(tests.affected($$update public.meeting_rsvps set response = 'yes' where meeting_id = tests.id('meeting_member') and user_id = tests.id('member')$$), 1, 'members change their RSVP');
select throws_ok($$insert into public.meeting_rsvps (meeting_id, user_id, response) values (tests.id('meeting_member'), tests.id('registered'), 'yes')$$, '42501', null, 'members cannot RSVP for others');
select throws_ok($$insert into public.meeting_rsvps (meeting_id, user_id, response) values (tests.id('meeting_board'), tests.id('member'), 'yes')$$, '42501', null, 'members cannot RSVP to meetings they cannot see');
select is(tests.rows($$select 1 from public.meeting_rsvps where user_id <> tests.id('member')$$), 0, 'members cannot read others'' RSVPs');
select is((select sum(total)::int from public.meeting_rsvp_counts(tests.id('meeting_member'))), 2, 'members read RSVP counts');
select is((select count(*)::int from public.meeting_rsvp_counts(tests.id('meeting_board'))), 0, 'no counts for meetings outside the audience');
select tests.as('board');
select is(tests.rows($$select 1 from public.meeting_rsvps$$), 2, 'board reads the attendance list');
select lives_ok($$insert into public.meetings (title, starts_at, audience) values ('Bureau', now() + interval '1 day', 'board')$$, 'board creates meetings');
select is(tests.affected($$update public.meetings set cancelled_at = now() where id = tests.id('meeting_member')$$), 1, 'board edits meetings');
select is(tests.affected($$delete from public.meetings where title = 'Bureau'$$), 1, 'board deletes meetings');

-- ── Tasks ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.tasks$$), 0, 'registered sees no tasks');
select tests.as('member');
select is(tests.rows($$select 1 from public.tasks where id in (tests.id('task_member'), tests.id('task_open'))$$), 2, 'members read member tasks');
select is(tests.rows($$select 1 from public.tasks where id = tests.id('task_board')$$), 0, 'members cannot read board tasks');
select is(tests.rows($$select 1 from public.tasks where id = tests.id('task_board_assigned')$$), 1, 'members read board tasks assigned to them');
select is(tests.affected($$update public.tasks set title = 'x' where id = tests.id('task_board_assigned')$$), 0, 'assignees cannot edit task details');
select lives_ok($$select public.set_task_status(tests.id('task_board_assigned'), 'in_progress')$$, 'assignees update the status');
select throws_ok($$select public.set_task_status(tests.id('task_member'), 'done')$$, '42501', null, 'non-assignees cannot change the status');
select lives_ok($$insert into public.task_assignees (task_id, user_id) values (tests.id('task_open'), tests.id('member'))$$, 'members self-assign open tasks');
select throws_ok($$insert into public.task_assignees (task_id, user_id) values (tests.id('task_member'), tests.id('member'))$$, '42501', null, 'members cannot self-assign closed tasks');
select throws_ok($$insert into public.task_assignees (task_id, user_id) values (tests.id('task_open'), tests.id('board'))$$, '42501', null, 'members cannot assign others');
select throws_ok($$insert into public.tasks (title) values ('x')$$, '42501', null, 'members cannot create tasks');
select lives_ok($$insert into public.task_comments (task_id, body_md) values (tests.id('task_member'), 'Je peux aider')$$, 'members comment on readable tasks');
select throws_ok($$insert into public.task_comments (task_id, body_md) values (tests.id('task_board'), 'x')$$, '42501', null, 'members cannot comment on hidden tasks');
select is(tests.affected($$update public.task_comments set body_md = 'Je peux aider samedi' where author_id = tests.id('member')$$), 1, 'members edit their own comments');
select is(tests.affected($$update public.task_comments set body_md = 'x' where id = tests.id('comment_board')$$), 0, 'members cannot edit others'' comments');
select is(tests.affected($$delete from public.task_comments where id = tests.id('comment_board')$$), 0, 'members cannot delete others'' comments');
select tests.as('board');
select lives_ok($$insert into public.tasks (title, audience) values ('Préparer le bilan', 'board')$$, 'board creates tasks');
select lives_ok($$insert into public.task_assignees (task_id, user_id) values (tests.id('task_member'), tests.id('registered'))$$, 'board assigns anyone');
select is(tests.affected($$delete from public.task_comments where author_id = tests.id('member')$$), 1, 'board deletes any comment');
select is(tests.affected($$delete from public.tasks where id = tests.id('task_board')$$), 1, 'board deletes tasks');

-- ── Announcements ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.announcements$$), 0, 'registered sees no announcements');
select tests.as('member');
select is(tests.rows($$select 1 from public.announcements where id = tests.id('announcement_member')$$), 1, 'members read member announcements');
select is(tests.rows($$select 1 from public.announcements where id = tests.id('announcement_board')$$), 0, 'members cannot read board announcements');
select is(tests.rows($$select 1 from public.announcements where id = tests.id('announcement_hidden')$$), 0, 'members do not see hidden Discord messages');
select throws_ok($$insert into public.announcements (body_md) values ('x')$$, '42501', null, 'members cannot post announcements');
select tests.as('board');
select is(tests.rows($$select 1 from public.announcements where id = tests.id('announcement_hidden')$$), 1, 'board sees hidden Discord messages');
select lives_ok($$insert into public.announcements (title, body_md) values ('Info', 'Texte')$$, 'board posts announcements');
select is((select source || ':' || (author_id = tests.id('board'))::text from public.announcements where title = 'Info'), 'board:true', 'source and author come from the session');
select is(tests.affected($$update public.announcements set hidden_at = now() where id = tests.id('announcement_member')$$), 1, 'board hides announcements');

-- ── Polls ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.polls$$), 0, 'registered sees no polls');
select tests.as('member');
select is(tests.rows($$select 1 from public.polls where id = tests.id('poll_board')$$), 0, 'members cannot read board polls');
select lives_ok($$insert into public.poll_votes (option_id, user_id, value) values (tests.id('option_member'), tests.id('member'), 'yes')$$, 'members vote');
select is(tests.affected($$update public.poll_votes set value = 'maybe' where option_id = tests.id('option_member') and user_id = tests.id('member')$$), 1, 'members change their vote');
select throws_ok($$insert into public.poll_votes (option_id, user_id) values (tests.id('option_closed'), tests.id('member'))$$, '42501', null, 'votes are locked after the poll closes');
select throws_ok($$insert into public.poll_votes (option_id, user_id) values (tests.id('option_board'), tests.id('member'))$$, '42501', null, 'members cannot vote in board polls');
select throws_ok($$insert into public.poll_votes (option_id, user_id) values (tests.id('option_member'), tests.id('board'))$$, '42501', null, 'members cannot vote for others');
select throws_ok($$insert into public.polls (title) values ('x')$$, '42501', null, 'members cannot create polls');
select tests.as('board');
select is(tests.rows($$select 1 from public.poll_votes where option_id = tests.id('option_member')$$), 1, 'results are visible');
select lives_ok($$insert into public.polls (title) values ('Date du concert')$$, 'board creates polls');
select is(tests.affected($$delete from public.polls where id = tests.id('poll_closed')$$), 1, 'board deletes polls');

-- ── Volunteering ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.volunteer_shifts$$), 0, 'registered sees no shifts');
select throws_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift_roomy'), tests.id('registered'))$$, '42501', null, 'registered cannot sign up');
select tests.as('member');
select is(tests.rows($$select 1 from public.volunteer_shifts$$), 2, 'members read shifts');
select lives_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift_roomy'), tests.id('member'))$$, 'members sign up');
select throws_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift_roomy'), tests.id('board'))$$, '42501', null, 'members cannot sign others up');
select throws_ok($$insert into public.volunteer_shifts (role_label, starts_at, ends_at, capacity) values ('{"fr":"x"}', now(), now() + interval '1 hour', 1)$$, '42501', null, 'members cannot create shifts');
select is((select taken::int from public.volunteer_shift_counts(tests.id('event_published')) where shift_id = tests.id('shift_roomy')), 1, 'members read places taken');
select is(tests.affected($$delete from public.volunteer_signups where user_id = tests.id('member')$$), 1, 'members cancel their own sign-up');
select tests.as('board');
select lives_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift_roomy'), tests.id('board'))$$, 'board members sign up too');
select is(tests.rows($$select 1 from public.volunteer_signups$$), 1, 'board reads all sign-ups');
select is(tests.affected($$update public.volunteer_shifts set capacity = 6 where id = tests.id('shift_roomy')$$), 1, 'board edits shifts');

-- ── Document library ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.documents$$), 0, 'registered sees no documents');
select tests.as('member');
select is(tests.rows($$select 1 from public.documents where id = tests.id('doc_member')$$), 1, 'members read member documents');
select is(tests.rows($$select 1 from public.documents where id in (tests.id('doc_board'), tests.id('doc_legal'))$$), 0, 'members cannot read board or legal documents');
select throws_ok($$insert into public.documents (title, storage_path, mime_type, size_bytes) values ('x', 'library/x/x.pdf', 'application/pdf', 1)$$, '42501', null, 'members cannot upload documents');
select tests.as('board');
select is(tests.rows($$select 1 from public.documents$$), 3, 'board reads every document');
select lives_ok($$insert into public.documents (title, storage_path, mime_type, size_bytes) values ('PV', 'library/pv/pv.pdf', 'application/pdf', 10)$$, 'board uploads library documents');
select is(tests.affected($$update public.documents set title = 'Guide v2' where id = tests.id('doc_member')$$), 1, 'board edits documents');
select is(tests.affected($$delete from public.documents where id = tests.id('doc_member')$$), 1, 'board deletes library documents');

select * from finish();
rollback;

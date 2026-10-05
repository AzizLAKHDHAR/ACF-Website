-- docs/roles.md §5 Admin space and the Guard rails: no self-escalation, last admin, audit log
-- immutability, correspondence transitions, closed ledger periods, volunteer capacity.
begin;
select no_plan();
select tests.setup();

-- ── §5 Admin space ──
select tests.as('board');
select is(tests.rows($$select 1 from public.audit_log$$), 0, 'board cannot read the audit log');
select is(tests.rows($$select 1 from public.integration_state$$), 0, 'board cannot read integration state');
select throws_ok($$insert into public.integration_state (key) values ('x')$$, '42501', null, 'board cannot write integration state');
select throws_ok($$select 1 from public.notification_deliveries$$, '42501', null, 'the delivery log is closed to the API');
select tests.as('admin');
select ok(tests.rows($$select 1 from public.audit_log$$) > 0, 'admin reads the audit log');
select is(tests.rows($$select 1 from public.integration_state$$), 1, 'admin reads integration state');
select is(tests.affected($$update public.integration_state set value = '{"after":"1"}' where key = 'test.cursor'$$), 1, 'admin updates integration state');
select throws_ok($$select 1 from public.notification_deliveries$$, '42501', null, 'not even admins read the delivery log through the API');

-- ── 1. No self-escalation ──
select tests.as('member');
select throws_ok($$insert into public.memberships (user_id, role) values (tests.id('registered'), 'admin')$$, '42501', null, 'members cannot create memberships');
select is(tests.affected($$update public.memberships set role = 'admin', status = 'active' where user_id = tests.id('member')$$), 0, 'members cannot promote themselves');
select tests.as('suspended');
select is(tests.affected($$update public.memberships set status = 'active' where user_id = tests.id('suspended')$$), 0, 'a suspended member cannot reactivate themselves');
select tests.as('registered');
select is(tests.affected($$update public.accounts set display_name = 'x' where id = tests.id('admin')$$), 0, 'users cannot edit an admin''s account');

-- ── 2. Last admin ──
select tests.as('admin');
select throws_ok($$update public.memberships set role = 'board' where user_id = tests.id('admin')$$, 'P0001', null, 'the last admin cannot demote themselves');
select throws_ok($$update public.memberships set status = 'suspended' where user_id = tests.id('admin')$$, 'P0001', null, 'the last admin cannot be suspended');
select throws_ok($$delete from public.memberships where user_id = tests.id('admin')$$, 'P0001', null, 'the last admin cannot be removed');
select throws_ok($$select public.set_account_deactivated(tests.id('admin'), true)$$, 'P0001', null, 'the last admin cannot be deactivated');
select tests.as_superuser();
select throws_ok($$delete from auth.users where id = tests.id('admin')$$, 'P0001', null, 'deleting the last admin''s user is blocked too');
select tests.as('admin');
select lives_ok($$insert into public.memberships (user_id, role) values (tests.id('registered'), 'admin')$$, 'a second admin is appointed');
select lives_ok($$update public.memberships set role = 'board' where user_id = tests.id('admin')$$, 'with another admin, an admin can step down');
select tests.as('registered');
select throws_ok($$delete from public.memberships where user_id = tests.id('registered')$$, 'P0001', null, 'the new last admin is protected in turn');
select lives_ok($$update public.memberships set role = 'admin' where user_id = tests.id('admin')$$, 'the new admin reinstates the original admin');

-- ── 3. Audit log immutability ──
select tests.as('registered');
select ok(tests.rows($$select 1 from public.audit_log$$) > 0, 'the (new) admin reads the audit log');
select throws_ok($$update public.audit_log set action = 'x'$$, '42501', null, 'admins cannot update audit rows');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'admins cannot delete audit rows');
select throws_ok($$insert into public.audit_log (action, table_name) values ('x', 'y')$$, '42501', null, 'admins cannot forge audit rows');
select tests.as_superuser();
select throws_ok($$update public.audit_log set action = 'x'$$, '42501', null, 'not even the table owner can update audit rows');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'not even the table owner can delete audit rows');
select throws_ok($$truncate public.audit_log$$, '42501', null, 'the audit log cannot be truncated');
select is((select actor_id from public.audit_log where table_name = 'memberships' and record_id = tests.id('registered')::text and action = 'insert'),
          tests.id('admin'), 'audit rows record the actor');

-- ── 4. Correspondence transitions ──
select tests.as('board');
select throws_ok($$update public.correspondence set status = 'signed' where id = tests.id('corr_sent')$$, '42501', null, 'status cannot be set directly');
select throws_ok($$select public.transition_correspondence(tests.id('corr_sent'), 'draft')$$, '42501', null, 'board cannot move backward');
select throws_ok($$select public.transition_correspondence(tests.id('corr_sent'), 'sent')$$, 'P0001', null, 'a no-op transition is rejected');
select lives_ok($$select public.transition_correspondence(tests.id('corr_sent'), 'awaiting_signature', 'Envoyé pour signature')$$, 'board moves forward');
select lives_ok($$select public.transition_correspondence(tests.id('corr_sent'), 'signed')$$, 'board moves forward again');
select isnt((select signed_at from public.correspondence where id = tests.id('corr_sent')), null, 'signed_at is stamped');
select is(tests.rows($$select 1 from public.correspondence_events where correspondence_id = tests.id('corr_sent')$$), 3, 'every move is on the timeline');
select throws_ok($$update public.correspondence_events set note = 'x' where correspondence_id = tests.id('corr_sent')$$, '42501', null, 'the timeline is immutable');
select throws_ok($$update public.correspondence set subject = 'x' where id = tests.id('corr_archived')$$, 'P0001', null, 'archived correspondence is read-only');
select throws_ok($$insert into public.correspondence_documents (correspondence_id, kind, storage_path) values (tests.id('corr_archived'), 'reply', 'correspondence/a/r.pdf')$$, 'P0001', null, 'no documents can be added to archived correspondence');
select tests.as('admin');
select lives_ok($$select public.transition_correspondence(tests.id('corr_archived'), 'signed', 'Réouvert pour correction')$$, 'admin moves backward (override)');
select is((select status::text from public.correspondence where id = tests.id('corr_archived')), 'signed', 'the override applies');
select ok(tests.rows($$select 1 from public.audit_log where table_name = 'correspondence' and record_id = tests.id('corr_archived')::text and actor_id = tests.id('admin')$$) >= 1, 'the override is audited');

-- ── 5. Closed ledger periods ──
select tests.as('board');
select is(tests.rows($$select 1 from public.ledger_entries where id = tests.id('entry_closed')$$), 1, 'entries of a closed period stay readable');
select throws_ok($$update public.ledger_entries set description = 'x' where id = tests.id('entry_closed')$$, 'P0001', null, 'entries of a closed period cannot be edited');
select throws_ok($$insert into public.ledger_entries (entry_date, direction, amount_millimes, category) values ('2025-06-01', 'expense', 1000, 'x')$$, 'P0001', null, 'no new entries in a closed period');
select throws_ok($$update public.ledger_entries set entry_date = '2025-06-01' where id = tests.id('entry_open')$$, 'P0001', null, 'entries cannot be moved into a closed period');
select throws_ok($$delete from public.receipts where id = tests.id('receipt_closed')$$, 'P0001', null, 'receipts of a closed period cannot be removed');
select is(tests.affected($$update public.ledger_periods set label = 'x' where id = tests.id('period_closed')$$), 0, 'board cannot edit a closed period');
select tests.as('admin');
select throws_ok($$update public.ledger_entries set description = 'x' where id = tests.id('entry_closed')$$, 'P0001', null, 'admins cannot edit closed periods either');
select lives_ok($$select public.set_ledger_period_closed(tests.id('period_closed'), false)$$, 'admin reopens the period');
select is(tests.affected($$update public.ledger_entries set description = 'Correction' where id = tests.id('entry_closed')$$), 1, 'entries are editable once reopened');
select lives_ok($$select public.set_ledger_period_closed(tests.id('period_closed'), true)$$, 'admin closes it again');
select ok(tests.rows($$select 1 from public.audit_log where table_name = 'ledger_periods' and record_id = tests.id('period_closed')::text and actor_id = tests.id('admin')$$) = 2, 'closing and reopening are audited');

-- ── 6. Volunteer capacity ──
select tests.as('member');
select lives_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift'), tests.id('member'))$$, 'the first volunteer takes the only place');
select tests.as('board');
select throws_ok($$insert into public.volunteer_signups (shift_id, user_id) values (tests.id('shift'), tests.id('board'))$$, 'P0001', 'This shift is full', 'a full shift refuses sign-ups');
-- Concurrent sign-ups are serialized by a row lock on the shift; the real race is exercised by
-- supabase/tests/concurrency/volunteer-capacity.sh (two sessions, run in CI).
select ok(pg_get_functiondef('private.enforce_shift_capacity()'::regprocedure) ~* 'for update', 'the capacity check locks the shift row');

select * from finish();
rollback;

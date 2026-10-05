-- docs/roles.md §2 Account: own account, own role, notifications, deletion request.
begin;
select no_plan();
select tests.setup();

-- Accounts are created on sign-up with the sign-up locale.
select is((select preferred_locale::text from public.accounts where id = tests.id('manager')), 'ar', 'the account keeps the sign-up locale');
select is((select display_name from public.accounts where id = tests.id('manager')), 'Test manager', 'the account keeps the sign-up display name');
select tests.as_superuser();
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'no-meta@test.acf.invalid', '{"locale":"xx"}');
select is((select preferred_locale::text || '|' || display_name from public.accounts where id = '00000000-0000-4000-8000-000000000001'),
          'fr|no-meta', 'an unknown locale falls back to French and the name to the email''s local part');

-- Own account
select tests.as('anon');
select throws_ok($$select 1 from public.accounts$$, '42501', null, 'anon cannot read accounts');
select tests.as('registered');
select is(tests.rows($$select 1 from public.accounts$$), 1, 'registered reads only their own account');
select is(tests.affected($$update public.accounts set display_name = 'Nouveau nom', preferred_locale = 'en' where id = tests.id('registered')$$), 1, 'users edit their own account');
select is(tests.affected($$update public.accounts set display_name = 'x' where id = tests.id('member')$$), 0, 'users cannot edit others'' accounts');
select throws_ok($$update public.accounts set deactivated_at = null where id = tests.id('registered')$$, '42501', null, 'users cannot change their deactivation');
select is(tests.rows($$select 1 from public.account_private where account_id = tests.id('registered')$$), 1, 'users read their own phone row');
select is(tests.affected($$update public.account_private set phone = '+216 22 222 222' where account_id = tests.id('registered')$$), 1, 'users update their own phone');
select is(tests.rows($$select 1 from public.account_private where account_id = tests.id('member')$$), 0, 'registered cannot read others'' phone numbers');

select tests.as('admin');
select ok(tests.rows($$select 1 from public.accounts$$) >= 8, 'admin reads all accounts');
select lives_ok($$select public.set_account_deactivated(tests.id('other'), true)$$, 'admin deactivates an account');
select tests.as('board');
select throws_ok($$select public.set_account_deactivated(tests.id('other'), false)$$, '42501', null, 'board cannot (de)activate accounts');

-- Own association role
select tests.as('registered');
select is(tests.rows($$select 1 from public.memberships$$), 0, 'registered users have no role row and see none');
select throws_ok($$insert into public.memberships (user_id, role) values (tests.id('registered'), 'admin')$$, '42501', null, 'no self-granted role');
select tests.as('member');
select is((select role::text from public.memberships where user_id = tests.id('member')), 'member', 'members read their own role');
select throws_ok($$insert into public.memberships (user_id, role) values (tests.id('registered'), 'member')$$, '42501', null, 'members cannot grant roles');
select is(tests.affected($$update public.memberships set role = 'admin' where user_id = tests.id('member')$$), 0, 'members cannot escalate themselves');
select tests.as('board');
select is(tests.affected($$update public.memberships set role = 'admin' where user_id = tests.id('board')$$), 0, 'board cannot escalate themselves');
select is(tests.affected($$delete from public.memberships where user_id = tests.id('member')$$), 0, 'board cannot revoke roles');
select tests.as('admin');
select lives_ok($$insert into public.memberships (user_id, role) values (tests.id('registered'), 'member')$$, 'admin grants roles');
select is((select granted_by from public.memberships where user_id = tests.id('registered')), tests.id('admin'), 'granted_by comes from the session');
select is(tests.affected($$update public.memberships set role = 'board' where user_id = tests.id('registered')$$), 1, 'admin changes roles');
select is(tests.affected($$delete from public.memberships where user_id = tests.id('registered')$$), 1, 'admin revokes roles');
select ok(tests.rows($$select 1 from public.audit_log where table_name = 'memberships' and record_id = tests.id('registered')::text$$) = 3, 'every role change is audited');

-- Notifications
select tests.as('member');
select is(tests.rows($$select 1 from public.notifications$$), 1, 'members read their own notifications');
select is(tests.affected($$update public.notifications set read_at = now() where id = tests.id('notification_member')$$), 1, 'members mark their notifications read');
select throws_ok($$update public.notifications set kind = 'x' where id = tests.id('notification_member')$$, '42501', null, 'only read_at is editable');
select tests.as('admin');
select is(tests.rows($$select 1 from public.notifications$$), 0, 'admins do not read others'' notifications');
select is(tests.affected($$update public.notifications set read_at = now()$$), 0, 'admins cannot mark others'' notifications');

-- Account deletion request
select tests.as('registered');
select lives_ok($$select public.request_account_deletion()$$, 'users request deletion of their own account');
select isnt((select deletion_requested_at from public.accounts where id = tests.id('registered')), null, 'the request is recorded');
select tests.as('anon');
select throws_ok($$select public.request_account_deletion()$$, '42501', null, 'anon cannot call it');

-- Invitations are admin-only and attach the role once the email is verified.
select tests.as('board');
select is(tests.rows($$select 1 from public.invitations$$), 0, 'board cannot read invitations');
select throws_ok($$insert into public.invitations (email, role) values ('x@test.acf.invalid', 'admin')$$, '42501', null, 'board cannot invite');
select tests.as('admin');
select is(tests.rows($$select 1 from public.invitations$$), 1, 'admin reads invitations');
select tests.as_superuser();
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'invitee@test.acf.invalid', '{}');
select is(tests.rows($$select 1 from public.memberships where user_id = '00000000-0000-4000-8000-000000000002'$$), 0,
          'an unverified sign-up with an invited email gets no role');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-8000-000000000002';
select is((select role::text from public.memberships where user_id = '00000000-0000-4000-8000-000000000002'), 'member',
          'verifying the invited email attaches the invited role');
select isnt((select accepted_at from public.invitations where id = tests.id('invitation')), null, 'the invitation is marked accepted');

select * from finish();
rollback;

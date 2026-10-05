-- Test helpers, installed once per `supabase test db` run (this file commits; every other file
-- runs inside a transaction that is rolled back). Test-only: never part of a migration.
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create table if not exists tests.fixture (key text primary key, id uuid not null);
grant select on tests.fixture to anon, authenticated;

-- Fixture id by key, e.g. tests.id('member') or tests.id('artist_a').
create or replace function tests.id(fixture_key text) returns uuid
  language sql stable
as $$ select id from tests.fixture where key = fixture_key $$;

-- SECURITY DEFINER so fixtures can be recorded while acting as any persona.
create or replace function tests.remember(fixture_key text, value uuid) returns uuid
  language sql security definer set search_path = ''
as $$ insert into tests.fixture (key, id) values (fixture_key, value)
      on conflict (key) do update set id = excluded.id returning id $$;

-- Creates a confirmed auth user; the on_auth_user_created trigger creates the account.
create or replace function tests.create_user(fixture_key text, locale text default 'fr') returns uuid
  language plpgsql
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          fixture_key || '@test.acf.invalid', '', now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('display_name', 'Test ' || fixture_key, 'locale', locale), now(), now());
  return tests.remember(fixture_key, new_id);
end;
$$;

-- Switch persona: 'anon', or the fixture key of a user. Lasts until the next call or the end of the
-- transaction. tests.as_superuser() switches back to the migration owner for setup steps.
create or replace function tests.as(persona text) returns void
  language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  if persona = 'anon' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', tests.id(persona), 'role', 'authenticated', 'aal', 'aal1')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end;
$$;

create or replace function tests.as_superuser() returns void
  language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Number of rows a query returns, as the current persona.
create or replace function tests.rows(query text) returns int
  language plpgsql
as $$
declare
  n int;
begin
  execute format('select count(*) from (%s) q', query) into n;
  return n;
end;
$$;

-- Number of rows an UPDATE/DELETE touched, as the current persona (RLS silently filters rows).
create or replace function tests.affected(statement text) returns int
  language plpgsql
as $$
declare
  n int;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ── The shared fixture ────────────────────────────────────────────────────────
-- Personas: registered (no role), manager (owns approved artist/venue/blog profiles, no role),
-- other (registered, owns another artist), member, board, admin, suspended (member, suspended),
-- deactivated (member, account deactivated). Plus one row of nearly everything.
create or replace function tests.setup() returns void
  language plpgsql
as $$
begin
  perform tests.as_superuser();
  truncate tests.fixture;
  -- Start from a clean slate whatever the seed contains (rolled back with the test's transaction).
  -- TRUNCATE skips row triggers, so the seed's admin doesn't trip the last-admin guard.
  truncate public.memberships, public.invitations, public.public_profiles, public.posts, public.events,
    public.documents, public.meetings, public.projects, public.tasks, public.announcements, public.polls,
    public.volunteer_shifts, public.ledger_entries, public.ledger_periods, public.correspondence,
    public.moderation_reports, public.notifications, public.notification_deliveries, public.site_settings,
    public.integration_state, public.review_events
    cascade;

  perform tests.create_user('registered');
  perform tests.create_user('manager', 'ar');
  perform tests.create_user('other');
  perform tests.create_user('member');
  perform tests.create_user('board');
  perform tests.create_user('admin');
  perform tests.create_user('suspended');
  perform tests.create_user('deactivated');

  insert into public.memberships (user_id, role, status) values
    (tests.id('member'), 'member', 'active'),
    (tests.id('board'), 'board', 'active'),
    (tests.id('admin'), 'admin', 'active'),
    (tests.id('suspended'), 'member', 'suspended'),
    (tests.id('deactivated'), 'member', 'active');
  update public.accounts set deactivated_at = now() where id = tests.id('deactivated');
  update public.account_private set phone = '+216 00 000 000' where account_id = tests.id('member');

  -- Taxonomies (the seed is not loaded in tests).
  insert into public.governorates (code, name) values ('TN-11', '{"ar":"تونس","fr":"Tunis","en":"Tunis"}')
    on conflict do nothing;
  insert into public.genres (id, slug, name)
    values (tests.remember('genre_rock', gen_random_uuid()), 'test-rock', '{"ar":"روك","fr":"Rock","en":"Rock"}');

  -- Profiles, created through the RPC as their owners, then reviewed by the admin.
  perform tests.as('manager');
  perform tests.remember('artist_a', public.create_profile('artist', 'test-artist-a', 'Fictional Artist A'));
  perform tests.remember('venue_a', public.create_profile('venue', 'test-venue-a', 'Fictional Venue A'));
  perform tests.remember('blog_a', public.create_profile('blog', 'test-blog-a', 'Fictional Blog A'));
  perform tests.remember('draft_a', public.create_profile('studio', 'test-draft-a', 'Fictional Draft A'));
  perform public.submit_profile(tests.id('artist_a'));
  perform public.submit_profile(tests.id('venue_a'));
  perform public.submit_profile(tests.id('blog_a'));
  perform tests.as('other');
  perform tests.remember('artist_b', public.create_profile('artist', 'test-artist-b', 'Fictional Artist B'));
  perform tests.remember('pending_b', public.create_profile('professional', 'test-pending-b', 'Fictional Pending B'));
  perform public.submit_profile(tests.id('artist_b'));
  perform public.submit_profile(tests.id('pending_b'));
  perform tests.as('admin');
  perform public.review_profile(tests.id('artist_a'), 'approved');
  perform public.review_profile(tests.id('venue_a'), 'approved');
  perform public.review_profile(tests.id('blog_a'), 'approved');
  perform public.review_profile(tests.id('artist_b'), 'approved');

  perform tests.as_superuser();
  update public.profile_private set contact_email = 'artist-a@test.acf.invalid' where profile_id = tests.id('artist_a');
  insert into public.profile_genres (profile_id, genre_id) values (tests.id('artist_a'), tests.id('genre_rock'));

  -- Content.
  insert into public.posts (id, kind, locale, slug, title, body_md, status, published_at, author_id) values
    (tests.remember('news_published', gen_random_uuid()), 'news', 'fr', 'test-news', 'Actualité fictive', 'Texte', 'published', now(), tests.id('board')),
    (tests.remember('news_draft', gen_random_uuid()), 'news', 'fr', 'test-news-draft', 'Brouillon fictif', 'Texte', 'draft', null, tests.id('board'));
  insert into public.posts (id, kind, blog_profile_id, locale, slug, title, body_md, status, published_at, author_id) values
    (tests.remember('blog_published', gen_random_uuid()), 'blog', tests.id('blog_a'), 'fr', 'test-blog-post', 'Billet fictif', 'Texte', 'published', now(), tests.id('manager')),
    (tests.remember('blog_draft', gen_random_uuid()), 'blog', tests.id('blog_a'), 'fr', 'test-blog-draft', 'Billet brouillon', 'Texte', 'draft', null, tests.id('manager'));
  insert into public.events (id, slug, title, starts_at, status, published_at) values
    (tests.remember('event_published', gen_random_uuid()), 'test-event', '{"fr":"Concert fictif"}', now() + interval '7 days', 'published', now());
  perform tests.as('manager');
  perform tests.remember('event_proposal', public.propose_event(tests.id('artist_a'), 'test-proposal',
    '{"fr":"Proposition fictive"}'::jsonb, now() + interval '14 days'));
  perform tests.as_superuser();

  -- Member space.
  insert into public.documents (id, collection, audience, title, storage_path, mime_type, size_bytes) values
    (tests.remember('doc_member', gen_random_uuid()), 'library', 'member', 'Guide fictif', 'library/doc-member/guide.pdf', 'application/pdf', 1000),
    (tests.remember('doc_board', gen_random_uuid()), 'library', 'board', 'Note du bureau', 'library/doc-board/note.pdf', 'application/pdf', 1000),
    (tests.remember('doc_legal', gen_random_uuid()), 'legal', 'board', 'Statuts fictifs', 'legal/statuts.pdf', 'application/pdf', 1000);
  insert into public.meetings (id, title, starts_at, audience) values
    (tests.remember('meeting_member', gen_random_uuid()), 'Assemblée fictive', now() + interval '3 days', 'member'),
    (tests.remember('meeting_board', gen_random_uuid()), 'Réunion du bureau', now() + interval '4 days', 'board');
  insert into public.meeting_rsvps (meeting_id, user_id, response) values
    (tests.id('meeting_member'), tests.id('board'), 'yes');
  insert into public.projects (id, name) values (tests.remember('project', gen_random_uuid()), 'Projet fictif');
  insert into public.project_budgets (project_id, total_planned_millimes) values (tests.id('project'), 5000000);
  insert into public.budget_lines (id, project_id, category, label, planned_millimes) values
    (tests.remember('budget_line', gen_random_uuid()), tests.id('project'), 'sound', 'Location son', 1000000);
  insert into public.tasks (id, title, audience, is_open, project_id) values
    (tests.remember('task_member', gen_random_uuid()), 'Tâche membres', 'member', false, tests.id('project')),
    (tests.remember('task_open', gen_random_uuid()), 'Tâche ouverte', 'member', true, null),
    (tests.remember('task_board', gen_random_uuid()), 'Tâche bureau', 'board', false, null),
    (tests.remember('task_board_assigned', gen_random_uuid()), 'Tâche bureau assignée', 'board', false, null);
  insert into public.task_assignees (task_id, user_id) values (tests.id('task_board_assigned'), tests.id('member'));
  insert into public.task_comments (id, task_id, author_id, body_md) values
    (tests.remember('comment_board', gen_random_uuid()), tests.id('task_member'), tests.id('board'), 'Commentaire');
  insert into public.announcements (id, audience, title, body_md, source) values
    (tests.remember('announcement_member', gen_random_uuid()), 'member', 'Annonce', 'Texte', 'board'),
    (tests.remember('announcement_board', gen_random_uuid()), 'board', 'Annonce bureau', 'Texte', 'board');
  insert into public.announcements (id, audience, body_md, source, discord_message_id, hidden_at) values
    (tests.remember('announcement_hidden', gen_random_uuid()), 'member', 'Message masqué', 'discord', 'discord-1', now());
  insert into public.polls (id, title, audience, closes_at) values
    (tests.remember('poll_member', gen_random_uuid()), 'Sondage', 'member', now() + interval '2 days'),
    (tests.remember('poll_board', gen_random_uuid()), 'Sondage bureau', 'board', null),
    (tests.remember('poll_closed', gen_random_uuid()), 'Sondage clos', 'member', now() - interval '1 day');
  insert into public.poll_options (id, poll_id, label) values
    (tests.remember('option_member', gen_random_uuid()), tests.id('poll_member'), 'Samedi'),
    (tests.remember('option_board', gen_random_uuid()), tests.id('poll_board'), 'Lundi'),
    (tests.remember('option_closed', gen_random_uuid()), tests.id('poll_closed'), 'Mardi');
  insert into public.volunteer_shifts (id, event_id, role_label, starts_at, ends_at, capacity) values
    (tests.remember('shift', gen_random_uuid()), tests.id('event_published'), '{"fr":"Accueil"}',
     now() + interval '7 days', now() + interval '7 days 3 hours', 1),
    (tests.remember('shift_roomy', gen_random_uuid()), tests.id('event_published'), '{"fr":"Bar"}',
     now() + interval '7 days', now() + interval '7 days 3 hours', 5);

  -- Board space.
  insert into public.ledger_periods (id, label, starts_on, ends_on) values
    (tests.remember('period_open', gen_random_uuid()), 'Fictif 2026', '2026-01-01', '2026-12-31'),
    (tests.remember('period_closed', gen_random_uuid()), 'Fictif 2025', '2025-01-01', '2025-12-31');
  insert into public.ledger_entries (id, entry_date, direction, amount_millimes, category, project_id) values
    (tests.remember('entry_open', gen_random_uuid()), '2026-03-01', 'expense', 250000, 'sound', tests.id('project')),
    (tests.remember('entry_closed', gen_random_uuid()), '2025-03-01', 'income', 100000, 'donation', null);
  insert into public.receipts (id, ledger_entry_id, storage_path, mime_type, size_bytes) values
    (tests.remember('receipt_open', gen_random_uuid()), tests.id('entry_open'), 'receipts/open/r.pdf', 'application/pdf', 1000),
    (tests.remember('receipt_closed', gen_random_uuid()), tests.id('entry_closed'), 'receipts/closed/r.pdf', 'application/pdf', 1000);
  update public.ledger_periods set closed_at = now() where id = tests.id('period_closed');
  insert into public.correspondence (id, subject) values
    (tests.remember('corr_draft', gen_random_uuid()), 'Demande fictive'),
    (tests.remember('corr_sent', gen_random_uuid()), 'Courrier envoyé fictif'),
    (tests.remember('corr_archived', gen_random_uuid()), 'Courrier archivé fictif');
  perform tests.as('board');
  perform public.transition_correspondence(tests.id('corr_sent'), 'sent');
  perform public.transition_correspondence(tests.id('corr_archived'), 'archived');
  perform tests.as_superuser();
  insert into public.correspondence_documents (id, correspondence_id, kind, storage_path) values
    (tests.remember('corr_doc_draft', gen_random_uuid()), tests.id('corr_draft'), 'original', 'correspondence/draft/o.pdf'),
    (tests.remember('corr_doc_sent', gen_random_uuid()), tests.id('corr_sent'), 'original', 'correspondence/sent/o.pdf');

  -- Platform.
  insert into public.moderation_reports (id, target_type, target_id, reason) values
    (tests.remember('report', gen_random_uuid()), 'profile', tests.id('artist_b'), 'spam');
  insert into public.notifications (id, user_id, kind) values
    (tests.remember('notification_member', gen_random_uuid()), tests.id('member'), 'test');
  insert into public.notification_deliveries (kind, target_id, user_id, channel) values
    ('test', tests.id('meeting_member'), tests.id('member'), 'email');
  insert into public.site_settings (key, value, is_public) values
    ('test.public', '"visible"', true), ('test.private', '"secret"', false);
  insert into public.integration_state (key, value) values ('test.cursor', '{"after":"0"}');
  insert into public.invitations (id, email, role) values
    (tests.remember('invitation', gen_random_uuid()), 'invitee@test.acf.invalid', 'member');

  perform tests.as_superuser();
end;
$$;
grant execute on function tests.setup() to anon, authenticated;

select plan(1);
select pass('test helpers installed');
select * from finish();

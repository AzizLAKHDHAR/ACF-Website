-- Phase 4 onboarding (docs/roles.md §1): co-managers, review decisions and their notifications,
-- decision-email recipients, post images for blog managers, translation groups, audit trail.
begin;
select no_plan();
select tests.setup();

-- ── Co-managers: owners add people by email; editors and strangers can't ──
select tests.as('anon');
select throws_ok($$select public.add_profile_manager(tests.id('artist_a'), 'member@test.acf.invalid')$$, '42501', null, 'anon cannot add managers');

select tests.as('registered');
select throws_ok($$select public.add_profile_manager(tests.id('artist_a'), 'registered@test.acf.invalid')$$, '42501', null, 'a non-owner cannot add themselves as a manager');

select tests.as('manager');
select throws_ok($$select public.add_profile_manager(tests.id('artist_a'), 'nobody@test.acf.invalid')$$, 'P0002', null, 'unknown emails are refused');
select throws_ok($$select public.add_profile_manager(tests.id('artist_a'), 'deactivated@test.acf.invalid')$$, 'P0002', null, 'deactivated accounts cannot become managers');
select throws_ok($$select public.add_profile_manager(tests.id('artist_a'), 'member@test.acf.invalid', 'admin')$$, '22023', null, 'only owner and editor roles exist');
select is(public.add_profile_manager(tests.id('artist_a'), ' Member@Test.acf.invalid '), tests.id('member'), 'the owner adds a co-manager by email (case and spaces ignored)');
select throws_ok($$select public.add_profile_manager(tests.id('artist_a'), 'member@test.acf.invalid')$$, '23505', null, 'a manager cannot be added twice');
select is((select count(*)::int from public.list_profile_managers(tests.id('artist_a'))), 2, 'the owner lists both managers');

select tests.as('member');
select is(tests.affected($$update public.public_profiles set city = 'Bizerte' where id = tests.id('artist_a')$$), 1, 'a co-manager edits the profile');
select is(tests.affected($$update public.artist_details set formed_year = 2010 where profile_id = tests.id('artist_a')$$), 1, 'a co-manager edits the type details');
select is(tests.rows($$select 1 from public.profile_private where profile_id = tests.id('artist_a')$$), 1, 'a co-manager reads the private contact');
select is((select count(*)::int from public.list_profile_managers(tests.id('artist_a'))), 2, 'a co-manager sees the other managers');
select throws_ok($$select public.add_profile_manager(tests.id('artist_a'), 'board@test.acf.invalid')$$, '42501', null, 'an editor cannot add managers');
select is(tests.affected($$delete from public.public_profiles where id = tests.id('artist_a')$$), 0, 'an editor cannot delete the profile');

select tests.as('other');
select is(tests.affected($$update public.public_profiles set city = 'Bizerte' where id = tests.id('artist_a')$$), 0, 'a non-manager cannot edit the profile');
select throws_ok($$select * from public.list_profile_managers(tests.id('artist_a'))$$, '42501', null, 'a non-manager cannot list managers');

select tests.as('admin');
select is((select count(*)::int from public.list_profile_managers(tests.id('artist_a'))), 2, 'the admin lists managers of any profile');

select tests.as('member');
select is(tests.affected($$delete from public.profile_managers where profile_id = tests.id('artist_a') and user_id = tests.id('member')$$), 1, 'a co-manager may leave the profile');
select is(tests.affected($$update public.public_profiles set city = 'Tunis' where id = tests.id('artist_a')$$), 0, 'after leaving, the profile is no longer editable');

select tests.as_superuser();
select is((select count(*)::int from public.audit_log where table_name = 'profile_managers' and record_id = tests.id('artist_a')::text and actor_id = tests.id('manager') and action = 'insert' and new_data ->> 'user_id' = tests.id('member')::text), 1, 'adding a manager is audited');
select is((select count(*)::int from public.audit_log where table_name = 'profile_managers' and record_id = tests.id('artist_a')::text and action = 'delete' and old_data ->> 'user_id' = tests.id('member')::text), 1, 'removing a manager is audited');

-- ── Review decisions: rejection with a public note, notifications, resubmission ──
select tests.as('admin');
select lives_ok($$select public.review_profile(tests.id('pending_b'), 'rejected', 'Merci d''ajouter une biographie.', 'Bio vide')$$, 'the admin rejects with a public and an internal note');

select tests.as('other');
select is((select status::text from public.public_profiles where id = tests.id('pending_b')), 'rejected', 'the owner sees the rejection');
select is((select note_public from public.review_events where target_id = tests.id('pending_b') and action = 'rejected'), 'Merci d''ajouter une biographie.', 'the owner reads the public note');
select is(tests.rows($$select 1 from public.review_event_notes$$), 0, 'the owner cannot read internal notes');
select is((select payload ->> 'decision' from public.notifications where user_id = tests.id('other') and kind = 'profile_review'), 'rejected', 'the owner is notified in-app');
select is((select payload ->> 'note_public' from public.notifications where user_id = tests.id('other') and kind = 'profile_review'), 'Merci d''ajouter une biographie.', 'the notification carries the public note');
select ok((select not (payload ? 'note_internal') from public.notifications where user_id = tests.id('other') and kind = 'profile_review'), 'the notification never carries the internal note');
select lives_ok($$select public.submit_profile(tests.id('pending_b'))$$, 'the owner resubmits a rejected profile');
select is((select status::text from public.public_profiles where id = tests.id('pending_b')), 'pending', 'the resubmitted profile is pending again');

select tests.as('manager');
select is(tests.rows($$select 1 from public.notifications where user_id = tests.id('other')$$), 0, 'others cannot read the notification');

select tests.as_superuser();
select is((select count(*)::int from public.audit_log where table_name = 'public_profiles' and record_id = tests.id('pending_b')::text and new_data ->> 'status' = 'rejected'), 1, 'the rejection is in audit_log');
select is((select count(*)::int from public.review_events where target_id = tests.id('pending_b')), 3, 'submitted, rejected and resubmitted are all in review_events');

-- Approval notifies every manager, owner and editors alike.
select tests.as('other');
select public.add_profile_manager(tests.id('pending_b'), 'member@test.acf.invalid');
select tests.as('admin');
select lives_ok($$select public.review_profile(tests.id('pending_b'), 'approved')$$, 'the admin approves the resubmitted profile');
select tests.as_superuser();
select is((select count(*)::int from public.notifications where kind = 'profile_review' and payload ->> 'decision' = 'approved' and payload ->> 'profile_id' = tests.id('pending_b')::text), 2, 'every manager is notified of the approval');
select tests.as('anon');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('pending_b')$$), 1, 'the approved profile is public');

-- ── Decision-email recipients: admin only, with each manager's locale ──
select tests.as('admin');
select results_eq(
  $$select email, locale::text from public.profile_review_recipients(tests.id('artist_a')) order by email$$,
  $$values ('manager@test.acf.invalid'::text, 'ar'::text)$$,
  'the admin gets each manager''s email and preferred locale');
select tests.as('manager');
select throws_ok($$select * from public.profile_review_recipients(tests.id('artist_a'))$$, '42501', null, 'managers cannot read recipient emails');
select tests.as('board');
select throws_ok($$select * from public.profile_review_recipients(tests.id('artist_a'))$$, '42501', null, 'the board cannot read recipient emails');
select tests.as('anon');
select throws_ok($$select * from public.profile_review_recipients(tests.id('artist_a'))$$, '42501', null, 'anon cannot read recipient emails');

-- ── Post images: blog managers write under their own posts only ──
select set_config('storage.allow_delete_query', 'true', true);
select tests.as('manager');
select lives_ok(format($$insert into storage.objects (bucket_id, name) values ('public-media', 'posts/%s/cover.webp')$$, tests.id('blog_draft')), 'a blog manager uploads an image for their own post');
select throws_ok(format($$insert into storage.objects (bucket_id, name) values ('public-media', 'posts/%s/cover.webp')$$, tests.id('news_draft')), '42501', null, 'a blog manager cannot upload news images');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'posts/not-a-uuid/cover.webp')$$, '42501', null, 'malformed post folders are refused');
select tests.as('other');
select throws_ok(format($$insert into storage.objects (bucket_id, name) values ('public-media', 'posts/%s/x.webp')$$, tests.id('blog_draft')), '42501', null, 'others cannot upload images for that post');
select tests.as('board');
select lives_ok(format($$insert into storage.objects (bucket_id, name) values ('public-media', 'posts/%s/board.webp')$$, tests.id('blog_draft')), 'the board still uploads into posts/');

-- ── Translations: same kind, same blog ──
select tests.as('manager');
select lives_ok($$insert into public.posts (kind, blog_profile_id, locale, translation_group, slug, title)
  values ('blog', tests.id('blog_a'), 'ar', (select translation_group from public.posts where id = tests.id('blog_draft')), 'test-blog-draft-ar', 'مسودة')$$,
  'a blog manager adds a translation to their own post');
select throws_ok($$insert into public.posts (kind, blog_profile_id, locale, translation_group, slug, title)
  values ('blog', tests.id('blog_a'), 'ar', (select translation_group from public.posts where id = tests.id('news_published')), 'test-hijack', 'x')$$,
  '23514', null, 'a blog post cannot join a news translation group');
select lives_ok($$select public.set_post_status(tests.id('blog_draft'), 'published')$$, 'an approved blog''s manager publishes directly');
select tests.as('anon');
select is(tests.rows($$select 1 from public.posts where id = tests.id('blog_draft')$$), 1, 'the published blog post is public');

-- ── Event proposals: an approved venue proposes at its venue; the board publishes ──
select tests.as('manager');
select lives_ok($$select tests.remember('venue_proposal', public.propose_event(tests.id('venue_a'), 'test-venue-night',
  '{"ar":"سهرة","fr":"Soirée fictive"}'::jsonb, now() + interval '20 days', venue_profile => tests.id('artist_b')))$$,
  'an approved venue proposes an event');
select is((select venue_profile_id from public.events where id = tests.id('venue_proposal')), tests.id('venue_a'), 'a venue''s proposal is always at that venue');
select tests.as('anon');
select is(tests.rows($$select 1 from public.events where id = tests.id('venue_proposal')$$), 0, 'a pending proposal is not public');
select tests.as('member');
select throws_ok($$select public.set_event_status(tests.id('venue_proposal'), 'published')$$, '42501', null, 'members cannot publish proposals');
select tests.as('board');
select lives_ok($$select public.set_event_status(tests.id('venue_proposal'), 'published')$$, 'the board publishes the proposal');
select tests.as('anon');
select is(tests.rows($$select 1 from public.events where id = tests.id('venue_proposal')$$), 1, 'the published event is public');
select tests.as('other');
select throws_ok($$select public.propose_event(tests.id('pending_b'), 'test-pro-event', '{"fr":"x"}'::jsonb, now() + interval '9 days')$$,
  '42501', null, 'a professional profile cannot propose events');

select * from finish();
rollback;

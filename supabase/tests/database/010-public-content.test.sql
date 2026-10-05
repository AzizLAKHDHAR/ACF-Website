-- docs/roles.md §1 Public content: anonymous, registered, profile owner, member, board, admin.
begin;
select no_plan();
select tests.setup();

-- ── Approved profiles: everyone reads; only admins moderate others' profiles ──
select tests.as('anon');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('artist_a')$$), 1, 'anon reads an approved profile');
select is(tests.rows($$select 1 from public.artist_details where profile_id = tests.id('artist_a')$$), 1, 'anon reads approved type details');
select is(tests.rows($$select 1 from public.profile_genres where profile_id = tests.id('artist_a')$$), 1, 'anon reads approved genres');
select throws_ok($$update public.public_profiles set display_name = 'x' where id = tests.id('artist_a')$$, '42501', null, 'anon cannot update profiles');

select tests.as('registered');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('artist_a')$$), 1, 'registered reads an approved profile');
select is(tests.affected($$update public.public_profiles set display_name = 'x' where id = tests.id('artist_a')$$), 0, 'registered cannot edit someone else''s profile');

select tests.as('member');
select is(tests.affected($$update public.public_profiles set display_name = 'x' where id = tests.id('artist_a')$$), 0, 'member cannot edit someone else''s profile');
select tests.as('board');
select is(tests.affected($$update public.public_profiles set display_name = 'x' where id = tests.id('artist_a')$$), 0, 'board cannot edit someone else''s profile');
select is(tests.affected($$delete from public.public_profiles where id = tests.id('artist_b')$$), 0, 'board cannot delete profiles');

select tests.as('admin');
select is(tests.affected($$update public.public_profiles set tagline = '{"fr":"Modéré"}' where id = tests.id('artist_b')$$), 1, 'admin moderates any profile');
select is(tests.affected($$update public.artist_details set formed_year = 2001 where profile_id = tests.id('artist_b')$$), 1, 'admin moderates type details');

-- ── Drafts and pending profiles: owners and admins only ──
select tests.as('anon');
select is(tests.rows($$select 1 from public.public_profiles where id in (tests.id('draft_a'), tests.id('pending_b'))$$), 0, 'anon cannot see draft or pending profiles');
select is(tests.rows($$select 1 from public.studio_details where profile_id = tests.id('draft_a')$$), 0, 'anon cannot see details of a draft');
select throws_ok($$select public.create_profile('artist', 'anon-artist', 'Anon')$$, '42501', null, 'anon cannot create profiles');

select tests.as('registered');
select is(tests.rows($$select 1 from public.public_profiles where id in (tests.id('draft_a'), tests.id('pending_b'))$$), 0, 'registered cannot see others'' drafts');
select lives_ok($$select tests.remember('registered_draft', public.create_profile('blog', 'registered-blog', 'Registered Blog'))$$, 'registered creates a draft profile');
select is((select status::text from public.public_profiles where id = tests.id('registered_draft')), 'draft', 'new profiles start as drafts');
select is(tests.rows($$select 1 from public.profile_managers where profile_id = tests.id('registered_draft') and user_id = tests.id('registered') and role = 'owner'$$), 1, 'creator becomes the owner');
select throws_ok($$insert into public.public_profiles (type, slug, display_name) values ('artist', 'direct-insert', 'x')$$, '42501', null, 'profiles cannot be inserted directly (RPC only)');
select throws_ok($$select public.submit_profile(tests.id('draft_a'))$$, '42501', null, 'non-managers cannot submit someone else''s profile');

select tests.as('member');
select is(tests.rows($$select 1 from public.public_profiles where id in (tests.id('draft_a'), tests.id('pending_b'))$$), 0, 'member cannot see others'' drafts');
select tests.as('board');
select is(tests.rows($$select 1 from public.public_profiles where id in (tests.id('draft_a'), tests.id('pending_b'))$$), 0, 'board cannot see others'' drafts');

select tests.as('manager');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('draft_a')$$), 1, 'owner reads own draft');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('pending_b')$$), 0, 'owner cannot read others'' pending profile');
select is(tests.affected($$update public.public_profiles set city = 'Sfax' where id = tests.id('draft_a')$$), 1, 'owner edits own draft');
select is(tests.affected($$update public.public_profiles set city = 'Sfax' where id = tests.id('artist_a')$$), 1, 'owner edits own approved profile');
select throws_ok($$update public.public_profiles set status = 'approved' where id = tests.id('draft_a')$$, '42501', null, 'owner cannot set the status directly');
select is(tests.affected($$delete from public.public_profiles where id = tests.id('artist_a')$$), 0, 'owner cannot delete an approved profile');
select is(tests.affected($$delete from public.public_profiles where id = tests.id('draft_a')$$), 1, 'owner deletes own draft');

select tests.as('other');
select is(tests.affected($$delete from public.public_profiles where id = tests.id('venue_a')$$), 0, 'non-owner cannot delete');

select tests.as('admin');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('pending_b')$$), 1, 'admin reads pending profiles');

-- ── Approval: admin only, valid transitions only ──
select tests.as('other');
select throws_ok($$select public.review_profile(tests.id('pending_b'), 'approved')$$, '42501', null, 'owner cannot approve own profile');
select tests.as('board');
select throws_ok($$select public.review_profile(tests.id('pending_b'), 'approved')$$, '42501', null, 'board cannot approve profiles');
select tests.as('admin');
select throws_ok($$select public.review_profile(tests.id('artist_a'), 'approved')$$, 'P0001', null, 'an approved profile cannot be approved again');
select lives_ok($$select public.review_profile(tests.id('pending_b'), 'rejected', 'Merci de compléter la bio', 'internal note')$$, 'admin rejects a pending profile with notes');
select tests.as('other');
select is((select note_public from public.review_events where target_id = tests.id('pending_b') and action = 'rejected'), 'Merci de compléter la bio', 'owner sees the public rejection note');
select is(tests.rows($$select 1 from public.review_event_notes$$), 0, 'owner cannot see internal review notes');
select tests.as('admin');
select is(tests.rows($$select 1 from public.review_event_notes$$), 1, 'admin reads internal review notes');
select lives_ok($$select public.review_profile(tests.id('artist_b'), 'suspended')$$, 'admin suspends an approved profile');
select tests.as('anon');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('artist_b')$$), 0, 'a suspended profile leaves the public catalogue');

-- ── Private contact details ──
select tests.as('anon');
select throws_ok($$select 1 from public.profile_private$$, '42501', null, 'anon has no access to profile_private');
select tests.as('manager');
select is(tests.rows($$select 1 from public.profile_private where profile_id = tests.id('artist_a')$$), 1, 'owner reads own contact details');
select is(tests.affected($$update public.profile_private set contact_phone = '+216 11 111 111' where profile_id = tests.id('artist_a')$$), 1, 'owner updates own contact details');
select tests.as('other');
select is(tests.rows($$select 1 from public.profile_private where profile_id = tests.id('artist_a')$$), 0, 'others cannot read contact details');
select tests.as('board');
select is(tests.rows($$select 1 from public.profile_private where profile_id = tests.id('artist_a')$$), 0, 'board cannot read profile contact details');
select tests.as('admin');
select is(tests.rows($$select 1 from public.profile_private where profile_id = tests.id('artist_a')$$), 1, 'admin reads contact details');
select is(tests.affected($$update public.profile_private set contact_phone = null where profile_id = tests.id('artist_a')$$), 0, 'admin cannot edit contact details');

-- ── Profile managers ──
select tests.as('manager');
select lives_ok($$insert into public.profile_managers (profile_id, user_id, role) values (tests.id('artist_a'), tests.id('registered'), 'editor')$$, 'owner adds a co-manager');
select throws_ok($$delete from public.profile_managers where profile_id = tests.id('venue_a') and user_id = tests.id('manager')$$, 'P0001', null, 'the last owner cannot leave');
select tests.as('registered');
select is(tests.rows($$select 1 from public.public_profiles where id = tests.id('artist_a') and status = 'approved'$$), 1, 'co-manager sees the profile');
select throws_ok($$insert into public.profile_managers (profile_id, user_id) values (tests.id('artist_a'), tests.id('other'))$$, '42501', null, 'an editor cannot add managers');
select tests.as('other');
select throws_ok($$insert into public.profile_managers (profile_id, user_id) values (tests.id('artist_a'), tests.id('other'))$$, '42501', null, 'nobody can add themselves to a profile');
select tests.as('admin');
select lives_ok($$insert into public.profile_managers (profile_id, user_id) values (tests.id('artist_b'), tests.id('member'))$$, 'admin adds managers');

-- ── Events ──
select tests.as('anon');
select is(tests.rows($$select 1 from public.events where id = tests.id('event_published')$$), 1, 'anon reads published events');
select is(tests.rows($$select 1 from public.events where id = tests.id('event_proposal')$$), 0, 'anon cannot see proposals');
select tests.as('member');
select throws_ok($$select public.propose_event(tests.id('artist_a'), 'nope', '{"fr":"x"}', now())$$, '42501', null, 'non-managers cannot propose events');
select tests.as('registered');
select throws_ok($$insert into public.events (slug, title, starts_at) values ('direct', '{"fr":"x"}', now())$$, '42501', null, 'registered cannot insert events');
select tests.as('other');
select is(tests.rows($$select 1 from public.events where id = tests.id('event_proposal')$$), 0, 'others cannot see a proposal');
select throws_ok($$select public.propose_event(tests.id('pending_b'), 'nope', '{"fr":"x"}', now())$$, '42501', null, 'unapproved profiles cannot propose events');
select tests.as('manager');
select is(tests.rows($$select 1 from public.events where id = tests.id('event_proposal')$$), 1, 'proposer reads own proposal');
select is(tests.rows($$select 1 from public.event_lineup where event_id = tests.id('event_proposal') and profile_id = tests.id('artist_a')$$), 1, 'an artist proposal puts the artist in the line-up');
select is(tests.affected($$update public.events set ticket_url = 'https://tickets.invalid/x' where id = tests.id('event_proposal')$$), 1, 'proposer edits own pending proposal');
select throws_ok($$select public.set_event_status(tests.id('event_proposal'), 'published')$$, '42501', null, 'proposer cannot publish');
select is(tests.affected($$update public.events set ticket_url = null where id = tests.id('event_published')$$), 0, 'proposer cannot edit published events');
select lives_ok($$select public.propose_event(tests.id('venue_a'), 'venue-night', '{"fr":"Soirée"}', now() + interval '20 days')$$, 'a venue proposes an event at its venue');
select is((select venue_profile_id from public.events where slug = 'venue-night'), tests.id('venue_a'), 'a venue proposal is pinned to that venue');
select tests.as('member');
select is(tests.rows($$select 1 from public.events where id = tests.id('event_proposal')$$), 0, 'members cannot see proposals');
select throws_ok($$select public.set_event_status(tests.id('event_proposal'), 'published')$$, '42501', null, 'members cannot publish events');
select is(tests.affected($$delete from public.events where id = tests.id('event_published')$$), 0, 'members cannot delete events');
select tests.as('board');
select is(tests.rows($$select 1 from public.events where id = tests.id('event_proposal')$$), 1, 'board reads proposals');
select lives_ok($$select public.set_event_status(tests.id('event_proposal'), 'published')$$, 'board publishes a proposal');
select lives_ok($$insert into public.events (slug, title, starts_at) values ('board-event', '{"fr":"Événement ACF"}', now() + interval '30 days')$$, 'board creates events');
select tests.as('manager');
select is(tests.affected($$update public.events set ticket_url = null where id = tests.id('event_proposal')$$), 0, 'proposer can no longer edit once published');
select tests.as('board');
select is(tests.affected($$delete from public.events where slug = 'board-event'$$), 1, 'board deletes events');

-- ── ACF news ──
select tests.as('anon');
select is(tests.rows($$select 1 from public.posts where id = tests.id('news_published')$$), 1, 'anon reads published news');
select is(tests.rows($$select 1 from public.posts where id = tests.id('news_draft')$$), 0, 'anon cannot read news drafts');
select tests.as('member');
select is(tests.rows($$select 1 from public.posts where id = tests.id('news_draft')$$), 0, 'members cannot read news drafts');
select throws_ok($$insert into public.posts (kind, locale, slug, title) values ('news', 'fr', 'member-news', 'x')$$, '42501', null, 'members cannot write news');
select throws_ok($$select public.set_post_status(tests.id('news_draft'), 'published')$$, '42501', null, 'members cannot publish news');
select tests.as('board');
select is(tests.rows($$select 1 from public.posts where id = tests.id('news_draft')$$), 1, 'board reads news drafts');
select lives_ok($$insert into public.posts (kind, locale, slug, title) values ('news', 'ar', 'board-news', 'خبر')$$, 'board writes news');
select is((select author_id from public.posts where slug = 'board-news'), tests.id('board'), 'the author is taken from the session');
select lives_ok($$select public.set_post_status(tests.id('news_draft'), 'published')$$, 'board publishes news');
select is(tests.affected($$delete from public.posts where slug = 'board-news'$$), 1, 'board deletes news');

-- ── Blog posts ──
select tests.as('manager');
select lives_ok($$insert into public.posts (kind, blog_profile_id, locale, slug, title) values ('blog', tests.id('blog_a'), 'en', 'my-post', 'My post')$$, 'blog owner writes under an approved blog');
select lives_ok($$select public.set_post_status((select id from public.posts where slug = 'my-post'), 'published')$$, 'blog owner publishes directly');
select is(tests.rows($$select 1 from public.posts where id = tests.id('blog_draft')$$), 1, 'blog owner reads own drafts');
select throws_ok($$insert into public.posts (kind, blog_profile_id, locale, slug, title, status) values ('blog', tests.id('blog_a'), 'en', 'sneaky', 'x', 'published')$$, '42501', null, 'posts cannot be inserted as published');
select tests.as('registered');
select throws_ok($$insert into public.posts (kind, blog_profile_id, locale, slug, title) values ('blog', tests.id('registered_draft'), 'en', 'early', 'x')$$, '42501', null, 'an unapproved blog cannot publish posts');
select tests.as('other');
select throws_ok($$insert into public.posts (kind, blog_profile_id, locale, slug, title) values ('blog', tests.id('blog_a'), 'en', 'intruder', 'x')$$, '42501', null, 'others cannot write in someone''s blog');
select is(tests.rows($$select 1 from public.posts where id = tests.id('blog_draft')$$), 0, 'others cannot read blog drafts');
select tests.as('board');
select is(tests.affected($$update public.posts set title = 'x' where id = tests.id('blog_published')$$), 0, 'board cannot edit blog posts');
select tests.as('admin');
select throws_ok($$select public.set_post_status(tests.id('blog_draft'), 'published')$$, '42501', null, 'admin cannot publish someone''s blog post');
select lives_ok($$select public.set_post_status(tests.id('blog_published'), 'unpublished', 'Contenu signalé')$$, 'admin unpublishes a blog post');
select is(tests.affected($$delete from public.posts where id = tests.id('blog_draft')$$), 1, 'admin deletes blog posts');

-- ── Taxonomies ──
select tests.as('anon');
select ok(tests.rows($$select 1 from public.genres$$) > 0, 'anon reads genres');
select throws_ok($$insert into public.genres (slug, name) values ('x', '{"ar":"x","fr":"x","en":"x"}')$$, '42501', null, 'anon cannot add genres');
select tests.as('board');
select throws_ok($$insert into public.genres (slug, name) values ('x', '{"ar":"x","fr":"x","en":"x"}')$$, '42501', null, 'board cannot add genres');
select tests.as('admin');
select lives_ok($$insert into public.genres (slug, name) values ('test-funk', '{"ar":"فانك","fr":"Funk","en":"Funk"}')$$, 'admin adds genres');
select is(tests.affected($$update public.governorates set position = 1 where code = 'TN-11'$$), 1, 'admin edits governorates');

-- ── Moderation reports ──
select tests.as('anon');
select throws_ok($$insert into public.moderation_reports (target_type, target_id, reason) values ('profile', tests.id('artist_a'), 'spam')$$, '42501', null, 'anon cannot report');
select tests.as('registered');
select lives_ok($$insert into public.moderation_reports (target_type, target_id, reason) values ('profile', tests.id('artist_a'), 'inaccurate')$$, 'registered users report content');
select is(tests.rows($$select 1 from public.moderation_reports$$), 0, 'reporters cannot read the queue');
select tests.as('member');
select is(tests.affected($$update public.moderation_reports set status = 'resolved'$$), 0, 'members cannot resolve reports');
select tests.as('admin');
select is(tests.rows($$select 1 from public.moderation_reports$$), 2, 'admin reads the moderation queue');
select is(tests.affected($$update public.moderation_reports set status = 'resolved', resolution_note = 'ok' where id = tests.id('report')$$), 1, 'admin resolves reports');
select is((select resolved_by from public.moderation_reports where id = tests.id('report')), tests.id('admin'), 'the resolver is taken from the session');

-- ── Public site settings ──
select tests.as('anon');
select is(tests.rows($$select 1 from public.site_settings where key like 'test.%'$$), 1, 'anon reads only public settings');
select tests.as('board');
select is(tests.rows($$select 1 from public.site_settings where key like 'test.%'$$), 1, 'board reads only public settings');
select is(tests.affected($$update public.site_settings set value = '"x"' where key = 'test.public'$$), 0, 'board cannot change settings');
select tests.as('admin');
select is(tests.rows($$select 1 from public.site_settings where key like 'test.%'$$), 2, 'admin reads every setting');
select is(tests.affected($$update public.site_settings set value = '"changed"' where key = 'test.public'$$), 1, 'admin changes settings');

select * from finish();
rollback;

-- Storage policies: public-media writes only into one's own folder; private buckets are closed to
-- lower roles (architecture §6 → Storage buckets).
begin;
select no_plan();
select tests.setup();
-- The Storage API sets this before running a delete as the user (RLS applies); do the same here.
select set_config('storage.allow_delete_query', 'true', true);

-- Objects that already exist (created as the owner role, bypassing RLS).
insert into storage.objects (bucket_id, name) values
  ('public-media', 'profiles/' || tests.id('artist_b') || '/avatar.webp'),
  ('member-documents', 'library/' || tests.id('doc_member') || '/guide.pdf'),
  ('member-documents', 'library/' || tests.id('doc_board') || '/note.pdf'),
  ('board-vault', 'legal/statuts.pdf'),
  ('board-vault', 'receipts/' || tests.id('entry_open') || '/r.pdf');

-- ── public-media ──
select tests.as('anon');
select is(tests.rows($$select 1 from storage.objects where bucket_id = 'public-media'$$), 1, 'anyone reads public media');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'site/x.webp')$$, '42501', null, 'anon cannot upload');

select tests.as('manager');
select lives_ok(format($$insert into storage.objects (bucket_id, name) values ('public-media', 'profiles/%s/cover.webp')$$, tests.id('artist_a')), 'managers upload into their profile''s folder');
select throws_ok(format($$insert into storage.objects (bucket_id, name) values ('public-media', 'profiles/%s/x.webp')$$, tests.id('artist_b')), '42501', null, 'managers cannot upload into someone else''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'profiles/not-a-uuid/x.webp')$$, '42501', null, 'malformed folders are refused');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'events/x.webp')$$, '42501', null, 'managers cannot upload event images');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'site/logo.webp')$$, '42501', null, 'managers cannot upload site assets');
select is(tests.affected(format($$delete from storage.objects where name = 'profiles/%s/avatar.webp'$$, tests.id('artist_b'))), 0, 'managers cannot delete others'' media');
select is(tests.affected(format($$delete from storage.objects where name = 'profiles/%s/cover.webp'$$, tests.id('artist_a'))), 1, 'managers delete their own media');

select tests.as('member');
select throws_ok(format($$insert into storage.objects (bucket_id, name) values ('public-media', 'profiles/%s/x.webp')$$, tests.id('artist_a')), '42501', null, 'members cannot upload profile media they do not manage');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'posts/x/cover.webp')$$, '42501', null, 'members cannot upload news images');

select tests.as('board');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'events/e1/cover.webp')$$, 'board uploads event images');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'posts/p1/cover.webp')$$, 'board uploads news images');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'site/banner.webp')$$, '42501', null, 'board cannot upload site assets');

select tests.as('admin');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('public-media', 'site/banner.webp')$$, 'admin uploads site assets');
select is(tests.affected(format($$delete from storage.objects where name = 'profiles/%s/avatar.webp'$$, tests.id('artist_b'))), 1, 'admin deletes any media');

-- ── member-documents ──
select tests.as('anon');
select is(tests.rows($$select 1 from storage.objects where bucket_id = 'member-documents'$$), 0, 'anon cannot read member documents');
select tests.as('registered');
select is(tests.rows($$select 1 from storage.objects where bucket_id = 'member-documents'$$), 0, 'registered cannot read member documents');
select tests.as('member');
select is(tests.rows($$select 1 from storage.objects where bucket_id = 'member-documents'$$), 1, 'members read only member-audience files');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('member-documents', 'library/x/y.pdf')$$, '42501', null, 'members cannot upload documents');
select tests.as('board');
select is(tests.rows($$select 1 from storage.objects where bucket_id = 'member-documents'$$), 2, 'board reads board-audience files too');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('member-documents', 'library/new/doc.pdf')$$, 'board uploads documents');

-- ── board-vault ──
select tests.as('member');
select is(tests.rows($$select 1 from storage.objects where bucket_id = 'board-vault'$$), 0, 'members cannot read the vault');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-vault', 'receipts/x/r.pdf')$$, '42501', null, 'members cannot upload to the vault');
select tests.as('board');
select is(tests.rows($$select 1 from storage.objects where bucket_id = 'board-vault'$$), 2, 'board reads the vault');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('board-vault', 'correspondence/c1/o.pdf')$$, 'board uploads correspondence files');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('board-vault', 'elsewhere/x.pdf')$$, '42501', null, 'vault uploads stay in known folders');
select is(tests.affected($$delete from storage.objects where bucket_id = 'board-vault' and name = 'legal/statuts.pdf'$$), 0, 'board cannot delete legal files');
select tests.as('admin');
select is(tests.affected($$delete from storage.objects where bucket_id = 'board-vault' and name = 'legal/statuts.pdf'$$), 1, 'admin deletes legal files');

select * from finish();
rollback;

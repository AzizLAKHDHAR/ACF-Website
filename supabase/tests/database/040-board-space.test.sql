-- docs/roles.md §4 Board space: member (denied except project names), board, admin.
begin;
select no_plan();
select tests.setup();

-- ── Projects and budgets ──
select tests.as('registered');
select is(tests.rows($$select 1 from public.projects$$), 0, 'registered sees no projects');
select tests.as('member');
select is(tests.rows($$select name from public.projects where id = tests.id('project')$$), 1, 'members read project names');
select is(tests.rows($$select 1 from public.project_budgets$$), 0, 'members cannot read budgets');
select is(tests.rows($$select 1 from public.budget_lines$$), 0, 'members cannot read budget lines');
select throws_ok($$insert into public.projects (name) values ('x')$$, '42501', null, 'members cannot create projects');
select tests.as('board');
select is(tests.rows($$select 1 from public.project_budgets$$), 1, 'board reads budgets');
select lives_ok($$insert into public.budget_lines (project_id, category, label, planned_millimes) values (tests.id('project'), 'travel', 'Transport', 300000)$$, 'board adds budget lines');
select is(tests.affected($$update public.project_budgets set total_planned_millimes = 6000000 where project_id = tests.id('project')$$), 1, 'board edits budgets');
select is(tests.affected($$delete from public.budget_lines where id = tests.id('budget_line')$$), 1, 'board deletes budget lines');

-- ── Ledger ──
select tests.as('member');
select is(tests.rows($$select 1 from public.ledger_entries$$), 0, 'members cannot read the ledger');
select throws_ok($$insert into public.ledger_entries (entry_date, direction, amount_millimes, category) values ('2026-05-01', 'income', 1000, 'x')$$, '42501', null, 'members cannot write the ledger');
select tests.as('board');
select is(tests.rows($$select 1 from public.ledger_entries$$), 2, 'board reads the ledger');
select lives_ok($$insert into public.ledger_entries (entry_date, direction, amount_millimes, category) values ('2026-05-01', 'income', 120000, 'membership')$$, 'board records entries');
select is((select period_id from public.ledger_entries where category = 'membership'), tests.id('period_open'), 'entries are filed in the period of their date');
select is(tests.affected($$update public.ledger_entries set description = 'Location console' where id = tests.id('entry_open')$$), 1, 'board edits entries in open periods');
select throws_ok($$update public.ledger_entries set deleted_at = now() where id = tests.id('entry_open')$$, '42501', null, 'board cannot delete entries');
select throws_ok($$delete from public.ledger_entries where id = tests.id('entry_open')$$, '42501', null, 'nobody hard-deletes entries (no DELETE grant)');
select lives_ok($$insert into public.ledger_entries (entry_date, direction, amount_millimes, category, reverses_entry_id) values ('2026-03-02', 'income', 250000, 'sound', tests.id('entry_open'))$$, 'board voids an entry with a reversal');
select throws_ok($$insert into public.ledger_entries (entry_date, direction, amount_millimes, category, reverses_entry_id) values ('2026-03-02', 'income', 1, 'x', tests.id('entry_closed'))$$, '23514', null, 'a reversal must mirror the original');
select throws_ok($$select public.set_ledger_period_closed(tests.id('period_open'), true)$$, '42501', null, 'board cannot close periods');
select lives_ok($$insert into public.ledger_periods (label, starts_on, ends_on) values ('Fictif 2027', '2027-01-01', '2027-12-31')$$, 'board opens new periods');
select throws_ok($$insert into public.ledger_periods (label, starts_on, ends_on, closed_at) values ('x', '2028-01-01', '2028-12-31', now())$$, '42501', null, 'board cannot create a period already closed');
select tests.as('admin');
select is(tests.affected($$update public.ledger_entries set deleted_at = now() where id = tests.id('entry_open')$$), 1, 'admin soft-deletes entries');
select tests.as('board');
select is(tests.rows($$select 1 from public.ledger_entries where id = tests.id('entry_open')$$), 0, 'board no longer sees a soft-deleted entry');
select tests.as('admin');
select is(tests.rows($$select 1 from public.ledger_entries where id = tests.id('entry_open')$$), 1, 'admin still sees it');
select ok(tests.rows($$select 1 from public.audit_log where table_name = 'ledger_entries' and record_id = tests.id('entry_open')::text and action = 'update'$$) >= 2, 'ledger changes are audited');

-- ── Receipts ──
select tests.as('member');
select is(tests.rows($$select 1 from public.receipts$$), 0, 'members cannot read receipts');
select tests.as('board');
select is(tests.rows($$select 1 from public.receipts$$), 2, 'board reads receipts');
select lives_ok($$insert into public.receipts (ledger_entry_id, storage_path, mime_type, size_bytes) values (tests.id('entry_open'), 'receipts/open/r2.pdf', 'application/pdf', 100)$$, 'board attaches receipts');
select is(tests.affected($$delete from public.receipts where id = tests.id('receipt_open')$$), 1, 'board removes receipts while the entry is open');

-- ── Legal vault ──
select tests.as('member');
select is(tests.rows($$select 1 from public.documents where collection = 'legal'$$), 0, 'members cannot read the legal vault');
select tests.as('board');
select lives_ok($$insert into public.documents (collection, audience, title, storage_path, mime_type, size_bytes) values ('legal', 'board', 'PV AG', 'legal/pv-ag.pdf', 'application/pdf', 10)$$, 'board files legal documents');
select throws_ok($$insert into public.documents (collection, audience, title, storage_path, mime_type, size_bytes) values ('legal', 'member', 'x', 'legal/x.pdf', 'application/pdf', 10)$$, '23514', null, 'legal documents are always board-only');
select is(tests.affected($$update public.documents set title = 'Statuts 2026' where id = tests.id('doc_legal')$$), 1, 'board edits legal documents');
select is(tests.affected($$delete from public.documents where id = tests.id('doc_legal')$$), 0, 'board cannot delete legal documents');
select tests.as('admin');
select is(tests.affected($$delete from public.documents where id = tests.id('doc_legal')$$), 1, 'admin deletes legal documents');

-- ── Correspondence ──
select tests.as('member');
select is(tests.rows($$select 1 from public.correspondence$$), 0, 'members cannot read correspondence');
select throws_ok($$insert into public.correspondence (subject) values ('x')$$, '42501', null, 'members cannot create correspondence');
select throws_ok($$select public.transition_correspondence(tests.id('corr_draft'), 'sent')$$, '42501', null, 'members cannot move correspondence');
select tests.as('board');
select is(tests.rows($$select 1 from public.correspondence$$), 3, 'board reads correspondence');
select lives_ok($$insert into public.correspondence (subject) values ('Nouvelle demande')$$, 'board creates correspondence');
select matches((select reference_code from public.correspondence where subject = 'Nouvelle demande'), '^ACF-[0-9]{4}-[0-9]{3}$', 'reference codes are generated');
select is(tests.affected($$update public.correspondence set subject = 'Demande corrigée' where id = tests.id('corr_sent')$$), 1, 'board edits correspondence');
select is(tests.rows($$select 1 from public.correspondence_events where correspondence_id = tests.id('corr_archived')$$), 1, 'board reads the timeline');
select is(tests.affected($$delete from public.correspondence where id = tests.id('corr_sent')$$), 0, 'board cannot delete sent correspondence');
select lives_ok($$insert into public.correspondence_documents (correspondence_id, kind, storage_path) values (tests.id('corr_sent'), 'signed', 'correspondence/sent/s.pdf')$$, 'board adds documents');
select throws_ok($$delete from public.correspondence_documents where id = tests.id('corr_doc_sent')$$, '42501', null, 'board removes documents only from drafts');
select is(tests.affected($$delete from public.correspondence_documents where id = tests.id('corr_doc_draft')$$), 1, 'board removes documents from drafts');
select is(tests.affected($$delete from public.correspondence where id = tests.id('corr_draft')$$), 1, 'board deletes drafts');
select tests.as('admin');
select is(tests.affected($$delete from public.correspondence where id = tests.id('corr_archived')$$), 1, 'admin deletes any correspondence');

select * from finish();
rollback;

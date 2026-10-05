-- Board space (hidden): budgets, ledger, receipts, correspondence with the supervising authority.
-- docs/roles.md §4. Money is bigint millimes. Closed ledger periods and archived correspondence are
-- immutable; correspondence status moves only through transition_correspondence().

-- ── Budgets (private columns split out of `projects`) ─────────────────────────
create table public.project_budgets (
  project_id uuid primary key references public.projects (id) on delete cascade,
  total_planned_millimes bigint not null default 0 check (total_planned_millimes >= 0),
  notes text,
  updated_at timestamptz not null default now()
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  category text not null,
  label text not null,
  planned_millimes bigint not null check (planned_millimes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budget_lines_project_idx on public.budget_lines (project_id);

-- ── Ledger ────────────────────────────────────────────────────────────────────
create table public.ledger_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  closed_at timestamptz,
  closed_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  direction public.ledger_direction not null,
  amount_millimes bigint not null check (amount_millimes > 0),
  category text not null,
  project_id uuid references public.projects (id) on delete set null,
  budget_line_id uuid references public.budget_lines (id) on delete set null,
  counterparty text,
  payment_method public.payment_method not null default 'bank_transfer',
  reference text,
  description text,
  period_id uuid references public.ledger_periods (id),
  reverses_entry_id uuid unique references public.ledger_entries (id),
  created_by uuid references public.accounts (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ledger_entries_period_idx on public.ledger_entries (period_id);
create index ledger_entries_project_idx on public.ledger_entries (project_id);
create index ledger_entries_date_idx on public.ledger_entries (entry_date);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  ledger_entry_id uuid not null references public.ledger_entries (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20 * 1024 * 1024),
  uploaded_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index receipts_entry_idx on public.receipts (ledger_entry_id);

-- ── Correspondence ────────────────────────────────────────────────────────────
create table public.correspondence (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  subject text not null check (char_length(subject) between 1 and 300),
  direction text not null default 'outgoing' check (direction in ('outgoing', 'incoming')),
  counterpart text not null default 'Supervising authority',
  counterpart_email extensions.citext,
  status public.correspondence_status not null default 'draft',
  owner_id uuid references public.accounts (id) on delete set null,
  due_on date,
  sent_at timestamptz,
  signed_at timestamptz,
  archived_at timestamptz,
  signature_provider text check (signature_provider in ('manual', 'documenso', 'docuseal')),
  signature_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index correspondence_status_idx on public.correspondence (status, due_on);

create table public.correspondence_documents (
  id uuid primary key default gen_random_uuid(),
  correspondence_id uuid not null references public.correspondence (id) on delete cascade,
  kind text not null check (kind in ('original', 'signed', 'attachment', 'reply')),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or (size_bytes > 0 and size_bytes <= 20 * 1024 * 1024)),
  uploaded_by uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index correspondence_documents_parent_idx on public.correspondence_documents (correspondence_id);

create table public.correspondence_events (
  id uuid primary key default gen_random_uuid(),
  correspondence_id uuid not null references public.correspondence (id) on delete cascade,
  from_status public.correspondence_status,
  to_status public.correspondence_status not null,
  actor_id uuid references public.accounts (id) on delete set null,
  note text,
  email_message_id text,
  created_at timestamptz not null default now()
);
create index correspondence_events_parent_idx on public.correspondence_events (correspondence_id, created_at);

-- ── Triggers ──────────────────────────────────────────────────────────────────
create trigger project_budgets_updated_at before update on public.project_budgets for each row execute function private.set_updated_at();
create trigger budget_lines_updated_at before update on public.budget_lines for each row execute function private.set_updated_at();
create trigger ledger_entries_updated_at before update on public.ledger_entries for each row execute function private.set_updated_at();
create trigger correspondence_updated_at before update on public.correspondence for each row execute function private.set_updated_at();

create trigger project_budgets_audit after insert or update or delete on public.project_budgets
  for each row execute function private.audit_row('project_id');
create trigger budget_lines_audit after insert or update or delete on public.budget_lines
  for each row execute function private.audit_row();
create trigger ledger_periods_audit after insert or update or delete on public.ledger_periods
  for each row execute function private.audit_row();
create trigger ledger_entries_audit after insert or update or delete on public.ledger_entries
  for each row execute function private.audit_row();
create trigger receipts_audit after insert or update or delete on public.receipts
  for each row execute function private.audit_row();
create trigger correspondence_audit after insert or update or delete on public.correspondence
  for each row execute function private.audit_row();

create trigger ledger_entries_stamp before insert on public.ledger_entries for each row execute function private.stamp_created_by();
create trigger receipts_stamp before insert on public.receipts for each row execute function private.stamp_uploaded_by();
create trigger correspondence_documents_stamp before insert on public.correspondence_documents for each row execute function private.stamp_uploaded_by();

-- Ledger: entries belong to the period containing their date. A closed period freezes its entries
-- (insert, update and delete) for everyone, admins included: reopen it first (audited).
create function private.ledger_entry_guard() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  old_closed boolean;
  new_closed boolean;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    select id into new.period_id from public.ledger_periods
      where new.entry_date between starts_on and ends_on
      order by starts_on desc limit 1;
    select closed_at is not null into new_closed from public.ledger_periods where id = new.period_id;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    select closed_at is not null into old_closed from public.ledger_periods where id = old.period_id;
  end if;
  if coalesce(old_closed, false) or coalesce(new_closed, false) then
    raise exception 'This ledger period is closed' using errcode = 'P0001',
      hint = 'An admin can reopen the period; otherwise record a reversal entry in an open period.';
  end if;
  if tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at and not private.has_role('admin') then
    raise exception 'Only an admin can delete ledger entries' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and new.reverses_entry_id is not null then
    perform 1 from public.ledger_entries r
      where r.id = new.reverses_entry_id and r.amount_millimes = new.amount_millimes
        and r.direction <> new.direction and r.deleted_at is null;
    if not found then
      raise exception 'A reversal must mirror the original entry (same amount, opposite direction)'
        using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger ledger_entries_guard before insert or update or delete on public.ledger_entries
  for each row execute function private.ledger_entry_guard();

-- Receipts can be added or removed only while their entry's period is open.
create function private.receipt_guard() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.ledger_entries e join public.ledger_periods p on p.id = e.period_id
    where e.id = coalesce(new.ledger_entry_id, old.ledger_entry_id) and p.closed_at is not null
  ) then
    raise exception 'The ledger period of this entry is closed' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger receipts_guard before insert or update or delete on public.receipts
  for each row execute function private.receipt_guard();

-- Correspondence: reference codes ACF-YYYY-NNN, numbered per year.
create function private.correspondence_reference() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  year_prefix text := 'ACF-' || to_char(now() at time zone 'Africa/Tunis', 'YYYY') || '-';
  next_number int;
begin
  if new.reference_code is null or new.reference_code = '' then
    perform pg_advisory_xact_lock(hashtext('correspondence_reference'));
    select coalesce(max(substring(reference_code from length(year_prefix) + 1)::int), 0) + 1
      into next_number
      from public.correspondence where reference_code like year_prefix || '%';
    new.reference_code := year_prefix || lpad(next_number::text, 3, '0');
  end if;
  return new;
end;
$$;
create trigger correspondence_reference before insert on public.correspondence
  for each row execute function private.correspondence_reference();

-- Status changes only through transition_correspondence(), which sets a transaction-local flag;
-- archived items are read-only.
create function private.correspondence_guard() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  in_transition boolean := coalesce(current_setting('acf.correspondence_transition', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' and not in_transition then
      raise exception 'New correspondence starts as a draft' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status and not in_transition then
    raise exception 'Use transition_correspondence() to change the status' using errcode = '42501';
  end if;
  if old.status = 'archived' and not in_transition then
    raise exception 'Archived correspondence is read-only' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger correspondence_guard before insert or update on public.correspondence
  for each row execute function private.correspondence_guard();

create function private.correspondence_document_guard() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  parent_status public.correspondence_status;
begin
  select status into parent_status from public.correspondence
    where id = coalesce(new.correspondence_id, old.correspondence_id);
  if parent_status = 'archived' then
    raise exception 'Archived correspondence is read-only' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' and parent_status <> 'draft' and not private.has_role('admin') then
    raise exception 'Documents can be removed only from drafts' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger correspondence_documents_guard before insert or update or delete on public.correspondence_documents
  for each row execute function private.correspondence_document_guard();

-- The timeline is append-only; rows disappear only with their correspondence (admin delete cascade).
create function private.correspondence_events_immutable() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.correspondence where id = old.correspondence_id) then
    return old;
  end if;
  raise exception 'correspondence_events rows are immutable' using errcode = '42501';
end;
$$;
create trigger correspondence_events_immutable before update or delete on public.correspondence_events
  for each row execute function private.correspondence_events_immutable();

-- ── RPCs ──────────────────────────────────────────────────────────────────────
create function private.correspondence_rank(s public.correspondence_status) returns int
  language sql immutable set search_path = ''
as $$ select array_position(enum_range(null::public.correspondence_status), s) $$;

-- Board+ move forward (draft → sent → awaiting_signature → signed → archived, steps may be
-- skipped); only an admin moves backward, and every move is written to the timeline + audit log.
create function public.transition_correspondence(item uuid, to_status public.correspondence_status,
                                                 note text default null)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  from_status public.correspondence_status;
begin
  if not private.has_role('board') then
    raise exception 'Only the board can move correspondence' using errcode = '42501';
  end if;
  select status into from_status from public.correspondence where id = item for update;
  if from_status is null then
    raise exception 'Correspondence not found' using errcode = 'P0002';
  end if;
  if to_status = from_status then
    raise exception 'Already %', to_status using errcode = 'P0001';
  end if;
  if private.correspondence_rank(to_status) < private.correspondence_rank(from_status)
     and not private.has_role('admin') then
    raise exception 'Only an admin can move correspondence backward' using errcode = '42501';
  end if;
  perform set_config('acf.correspondence_transition', 'on', true);
  update public.correspondence
    set status = to_status,
        sent_at = case when to_status = 'sent' then coalesce(sent_at, now()) else sent_at end,
        signed_at = case when to_status = 'signed' then coalesce(signed_at, now()) else signed_at end,
        archived_at = case when to_status = 'archived' then now() else null end
    where id = item;
  perform set_config('acf.correspondence_transition', 'off', true);
  insert into public.correspondence_events (correspondence_id, from_status, to_status, actor_id, note)
  values (item, from_status, to_status, (select auth.uid()), note);
end;
$$;

-- Admin: close or reopen a ledger period (audited through the ledger_periods trigger).
create function public.set_ledger_period_closed(period uuid, closed boolean) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_role('admin') then
    raise exception 'Only an admin can close or reopen ledger periods' using errcode = '42501';
  end if;
  update public.ledger_periods
    set closed_at = case when closed then coalesce(closed_at, now()) end,
        closed_by = case when closed then (select auth.uid()) end
    where id = period;
  if not found then
    raise exception 'Ledger period not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.project_budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.ledger_periods enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.receipts enable row level security;
alter table public.correspondence enable row level security;
alter table public.correspondence_documents enable row level security;
alter table public.correspondence_events enable row level security;

create policy "project_budgets: board reads" on public.project_budgets for select to authenticated
  using ((select private.has_role('board')));
create policy "budget_lines: board reads" on public.budget_lines for select to authenticated
  using ((select private.has_role('board')));
create policy "project_budgets: board manages (insert)" on public.project_budgets for insert to authenticated
  with check ((select private.has_role('board')));
create policy "project_budgets: board manages (update)" on public.project_budgets for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "project_budgets: board manages (delete)" on public.project_budgets for delete to authenticated
  using ((select private.has_role('board')));
create policy "budget_lines: board manages (insert)" on public.budget_lines for insert to authenticated
  with check ((select private.has_role('board')));
create policy "budget_lines: board manages (update)" on public.budget_lines for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "budget_lines: board manages (delete)" on public.budget_lines for delete to authenticated
  using ((select private.has_role('board')));

-- Periods: board reads and opens new ones; closing/reopening is admin-only (function above, and
-- closed_at/closed_by are not granted for direct updates).
create policy "ledger_periods: board reads" on public.ledger_periods for select to authenticated
  using ((select private.has_role('board')));
create policy "ledger_periods: board creates" on public.ledger_periods for insert to authenticated
  with check ((select private.has_role('board')) and closed_at is null);
create policy "ledger_periods: board edits open periods" on public.ledger_periods for update to authenticated
  using ((select private.has_role('board')) and closed_at is null)
  with check ((select private.has_role('board')));

-- Entries: board creates, reads (admins also see soft-deleted ones) and edits while open; no hard
-- deletes for anyone (corrections are reversal entries, removals are admin soft deletes).
create policy "ledger_entries: board reads" on public.ledger_entries for select to authenticated
  using (((select private.has_role('board')) and deleted_at is null) or (select private.has_role('admin')));
create policy "ledger_entries: board creates" on public.ledger_entries for insert to authenticated
  with check ((select private.has_role('board')) and deleted_at is null);
create policy "ledger_entries: board edits" on public.ledger_entries for update to authenticated
  using ((select private.has_role('board')) and (deleted_at is null or (select private.has_role('admin'))))
  with check ((select private.has_role('board')));

create policy "receipts: board reads" on public.receipts for select to authenticated
  using ((select private.has_role('board')));
create policy "receipts: board adds" on public.receipts for insert to authenticated
  with check ((select private.has_role('board')));
create policy "receipts: board removes while open" on public.receipts for delete to authenticated
  using ((select private.has_role('board')));

-- Correspondence: board C, R, U and deletes drafts; admins delete anything (roles.md §4).
create policy "correspondence: board reads" on public.correspondence for select to authenticated
  using ((select private.has_role('board')));
create policy "correspondence: board creates" on public.correspondence for insert to authenticated
  with check ((select private.has_role('board')));
create policy "correspondence: board edits" on public.correspondence for update to authenticated
  using ((select private.has_role('board'))) with check ((select private.has_role('board')));
create policy "correspondence: board deletes drafts, admin deletes" on public.correspondence for delete to authenticated
  using ((status = 'draft' and (select private.has_role('board'))) or (select private.has_role('admin')));

create policy "correspondence_documents: board reads" on public.correspondence_documents for select to authenticated
  using ((select private.has_role('board')));
create policy "correspondence_documents: board adds" on public.correspondence_documents for insert to authenticated
  with check ((select private.has_role('board')));
create policy "correspondence_documents: board removes (drafts only, trigger)" on public.correspondence_documents for delete to authenticated
  using ((select private.has_role('board')));

create policy "correspondence_events: board reads" on public.correspondence_events for select to authenticated
  using ((select private.has_role('board')));

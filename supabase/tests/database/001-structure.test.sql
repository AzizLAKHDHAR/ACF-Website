-- Structural guarantees: RLS everywhere, no dangerous grants, hardened functions, buckets.
begin;
select no_plan();

-- Every table in `public` has RLS enabled.
select is(
  array(select c.relname::text from pg_class c
        where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity
        order by 1),
  array[]::text[],
  'every table in public has RLS enabled');

-- …and at least one policy, unless it is a documented deny-all table (service role only).
select is(
  array(select c.relname::text from pg_class c
        where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
          and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
        order by 1),
  array['notification_deliveries']::text[],
  'every table has policies except the documented deny-all tables');

-- The API roles never get TRUNCATE (it bypasses RLS), REFERENCES or TRIGGER.
select is(
  array(select format('%s:%s:%s', g.grantee, g.table_name, g.privilege_type)
        from information_schema.role_table_grants g
        where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
          and g.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
        order by 1),
  array[]::text[],
  'anon/authenticated have no TRUNCATE, REFERENCES or TRIGGER privileges');

-- Anonymous visitors can only SELECT the public catalogue.
select is(
  array(select format('%s:%s', g.table_name, g.privilege_type)
        from information_schema.role_table_grants g
        where g.table_schema = 'public' and g.grantee = 'anon'
        order by 1),
  array['artist_details:SELECT', 'event_lineup:SELECT', 'events:SELECT', 'genres:SELECT',
        'governorates:SELECT', 'posts:SELECT', 'professional_details:SELECT', 'professions:SELECT',
        'profile_genres:SELECT', 'profile_professions:SELECT', 'public_profiles:SELECT',
        'site_settings:SELECT', 'studio_details:SELECT', 'venue_details:SELECT'],
  'anon only reads the public catalogue tables');
select is(
  array(select g.privilege_type || ':' || g.table_name || '.' || g.column_name
        from information_schema.column_privileges g
        where g.table_schema = 'public' and g.grantee = 'anon' and g.privilege_type <> 'SELECT'
        order by 1),
  array[]::text[],
  'anon has no column-level write privileges');

-- Signed-in users can't write the columns that only functions/triggers may set.
select ok(not has_column_privilege('authenticated', 'public.public_profiles', 'status', 'UPDATE'), 'profile status is not directly updatable');
select ok(not has_column_privilege('authenticated', 'public.posts', 'status', 'UPDATE'), 'post status is not directly updatable');
select ok(not has_column_privilege('authenticated', 'public.events', 'status', 'UPDATE'), 'event status is not directly updatable');
select ok(not has_column_privilege('authenticated', 'public.correspondence', 'status', 'UPDATE'), 'correspondence status is not directly updatable');
select ok(not has_column_privilege('authenticated', 'public.ledger_periods', 'closed_at', 'UPDATE'), 'ledger period closing is not directly updatable');
select ok(not has_column_privilege('authenticated', 'public.accounts', 'deactivated_at', 'UPDATE'), 'account deactivation is not self-service');
select ok(not has_table_privilege('authenticated', 'public.audit_log', 'INSERT'), 'nobody inserts audit rows through the API');
select ok(not has_table_privilege('authenticated', 'public.notification_deliveries', 'SELECT'), 'delivery log is service-role only');

-- SECURITY DEFINER functions pin their search_path (no search_path hijacking).
select is(
  array(select p.oid::regprocedure::text from pg_proc p
        where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace) and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
        order by 1),
  array[]::text[],
  'every SECURITY DEFINER function sets search_path');

-- No function in public is executable by anonymous visitors.
select is(
  array(select p.oid::regprocedure::text from pg_proc p
        where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE')
        order by 1),
  array[]::text[],
  'anon cannot execute any public function');

-- Storage buckets.
select results_eq(
  $$select id, public from storage.buckets where id in ('public-media', 'member-documents', 'board-vault') order by id$$,
  $$values ('board-vault'::text, false), ('member-documents', false), ('public-media', true)$$,
  'buckets exist with the right visibility');

select * from finish();
rollback;

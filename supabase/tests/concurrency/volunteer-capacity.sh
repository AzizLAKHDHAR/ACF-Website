#!/usr/bin/env bash
# Two members race for the last place on a one-place volunteer shift, in two real sessions.
# Without the row lock in private.enforce_shift_capacity(), both inserts would succeed under
# READ COMMITTED. Run against the local stack: `bash supabase/tests/concurrency/volunteer-capacity.sh`.
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
psql_q() { psql "$DB_URL" -v ON_ERROR_STOP=1 -qAt "$@"; }

ids=$(psql_q <<'SQL'
with u as (
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'race-' || n || '-' || gen_random_uuid() || '@test.acf.invalid', now(), '{}'
  from generate_series(1, 2) n
  returning id
), m as (
  insert into public.memberships (user_id, role) select id, 'member' from u returning user_id
), s as (
  insert into public.volunteer_shifts (role_label, starts_at, ends_at, capacity)
  values ('{"fr":"Course"}', now(), now() + interval '1 hour', 1) returning id
)
select (select id from s) || ' ' || string_agg(user_id::text, ' ') from m;
SQL
)
read -r shift user_a user_b <<<"$ids"

attempt() {
  local user=$1 pause=$2
  psql "$DB_URL" -qAt 2>&1 <<SQL || true
begin;
select set_config('request.jwt.claims', '{"sub":"$user","role":"authenticated"}', true);
set local role authenticated;
insert into public.volunteer_signups (shift_id, user_id) values ('$shift', '$user');
select pg_sleep($pause);
commit;
SQL
}

attempt "$user_a" 2 >/tmp/acf-race-a.log &
sleep 0.5
attempt "$user_b" 0 >/tmp/acf-race-b.log &
wait

taken=$(psql_q -c "select count(*) from public.volunteer_signups where shift_id = '$shift'")
psql_q >/dev/null <<SQL
delete from public.volunteer_shifts where id = '$shift';
delete from auth.users where id in ('$user_a', '$user_b');
SQL

if [[ "$taken" == "1" ]] && grep -q "This shift is full" /tmp/acf-race-b.log; then
  echo "ok - concurrent sign-ups: one place taken, the second session was refused"
else
  echo "not ok - expected 1 sign-up and a 'shift is full' error, got $taken"
  cat /tmp/acf-race-a.log /tmp/acf-race-b.log
  exit 1
fi

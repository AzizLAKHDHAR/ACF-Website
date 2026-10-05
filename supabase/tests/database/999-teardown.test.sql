-- Removes the test helpers installed by 000-helpers so the database is left as the migrations
-- built it (the advisors in `npm run db:lint` would otherwise flag the helper functions).
select plan(1);
drop schema tests cascade;
select pass('test helpers removed');
select * from finish();

-- Search normalization (D-061): accents, Arabic letter variants and diacritics fold the same way
-- in the `search` columns and in the app's queries (src/lib/content/search.ts mirrors this).
begin;
select plan(8);

select is(private.search_normalize('Soirée Été'), 'soiree ete', 'Latin accents are stripped');
select is(private.search_normalize('الأمواج'), 'الامواج', 'hamza forms of alef fold to bare alef');
select is(private.search_normalize('إآٱ'), 'ااا', 'every alef variant folds');
select is(private.search_normalize('مدرسة'), 'مدرسه', 'taa marbuta folds to haa');
select is(private.search_normalize('موسيقى'), 'موسيقي', 'alef maqsura folds to yaa');
select is(private.search_normalize('مُوسِيقَى'), 'موسيقي', 'harakat are dropped');
select is(private.search_normalize('جـــاز'), 'جاز', 'tatweel is dropped');
select is(
  (select count(*)::int from public.public_profiles
    where search @@ to_tsquery('simple', private.search_normalize('الامواج') || ':*')),
  1,
  'a query without hamza finds «الأمواج»'
);

select * from finish();
rollback;

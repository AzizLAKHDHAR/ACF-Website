-- Search that forgives how people type (D-061). The generated `search` columns now go through
-- private.search_normalize(): Latin accents removed (unaccent), Arabic alef forms unified (أ إ آ ٱ → ا),
-- ta marbuta and alef maqsura folded (ة → ه, ى → ي) and harakat/tatweel dropped. The app applies the
-- same rules to the query (src/lib/content/search.ts), so «الامواج», «الأمواج» and «الأمْواج» all match.

create function private.search_normalize(value text) returns text
  language sql immutable parallel safe strict set search_path = ''
as $$
  select translate(
    regexp_replace(private.immutable_unaccent(lower(value)), '[ً-ٰٟـ]', '', 'g'),
    'أإآٱةى',
    'اااا' || 'هي'
  )
$$;
grant execute on function private.search_normalize(text) to anon, authenticated, service_role;

drop index public.public_profiles_search_idx;
alter table public.public_profiles drop column search;
alter table public.public_profiles add column search tsvector generated always as (
  to_tsvector('simple', private.search_normalize(
    display_name || ' ' || coalesce(city, '') || ' ' || private.locale_map_text(tagline)
  ))
) stored;
create index public_profiles_search_idx on public.public_profiles using gin (search);

drop index public.events_search_idx;
alter table public.events drop column search;
alter table public.events add column search tsvector generated always as (
  to_tsvector('simple', private.search_normalize(private.locale_map_text(title) || ' ' || coalesce(venue_text, '')))
) stored;
create index events_search_idx on public.events using gin (search);

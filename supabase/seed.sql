-- Local / preview seed. Loaded by `npx supabase db reset` only; never pushed to production
-- (`supabase db push` does not run it). Two parts:
--   1. (Taxonomies now come from a migration, see below.)
--   2. CLEARLY FICTIONAL demo data: users on the reserved `.test` domain, made-up names, no real
--      people or places. Every demo password is `demo-password-1` (local only).
-- CLAUDE.md → "No fabricated content": nothing below is presented as fact on a real site.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Taxonomies
-- ════════════════════════════════════════════════════════════════════════════

-- Governorates, genres and professions are reference data: they live in migration
-- 20261006000000_reference_taxonomies.sql so production gets them too.

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Fictional demo data (local and preview only)
-- ════════════════════════════════════════════════════════════════════════════

-- Demo users (password `demo-password-1`). GoTrue needs the token columns as '' rather than NULL,
-- and an email identity per user.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email,
       extensions.crypt('demo-password-1', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('display_name', u.display_name, 'locale', u.locale), now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-a000-000000000001', 'admin@acf.test', 'Démo Admin', 'fr'),
  ('00000000-0000-4000-a000-000000000002', 'board@acf.test', 'Démo Bureau', 'fr'),
  ('00000000-0000-4000-a000-000000000003', 'member@acf.test', 'عضو تجريبي', 'ar'),
  ('00000000-0000-4000-a000-000000000004', 'artist@acf.test', 'Demo Artist', 'en'),
  ('00000000-0000-4000-a000-000000000005', 'venue@acf.test', 'Démo Salle', 'fr'),
  ('00000000-0000-4000-a000-000000000006', 'registered@acf.test', 'Démo Inscrit', 'fr')
) as u (id, email, display_name, locale);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u where u.email like '%@acf.test';

-- Bootstrap: the first admin is granted by SQL (docs/architecture.md → Admin bootstrap).
insert into public.memberships (user_id, role) values
  ('00000000-0000-4000-a000-000000000001', 'admin'),
  ('00000000-0000-4000-a000-000000000002', 'board'),
  ('00000000-0000-4000-a000-000000000003', 'member');

-- Fictional public profiles (approved unless noted). Names are invented and marked as demos.
insert into public.public_profiles (id, type, slug, status, display_name, tagline, bio, governorate_code, city,
                                    links, created_by, submitted_at, approved_at, approved_by)
values
  ('00000000-0000-4000-b000-000000000001', 'artist', 'demo-les-pixels', 'approved', 'Les Pixels (démo)',
   '{"fr":"Groupe fictif de rock alternatif","ar":"فرقة روك بديل خيالية","en":"Fictional alternative rock band"}',
   '{"fr":"Profil de démonstration : ce groupe n’existe pas.","ar":"ملف تجريبي: هذه الفرقة غير موجودة.","en":"Demo profile: this band does not exist."}',
   'TN-11', 'Tunis', '[{"kind":"website","url":"https://example.org/demo-band"}]',
   '00000000-0000-4000-a000-000000000004', now(), now(), '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000002', 'venue', 'demo-salle-imaginaire', 'approved', 'Salle Imaginaire (démo)',
   '{"fr":"Salle de concert fictive","ar":"قاعة حفلات خيالية","en":"Fictional concert hall"}',
   '{"fr":"Lieu de démonstration, inexistant.","ar":"مكان تجريبي غير موجود.","en":"Demo venue that does not exist."}',
   'TN-51', 'Sousse', '[]', '00000000-0000-4000-a000-000000000005', now(), now(), '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000003', 'blog', 'demo-carnet-sonore', 'approved', 'Carnet sonore (démo)',
   '{"fr":"Blog fictif sur la scène","ar":"مدونة خيالية عن المشهد","en":"Fictional blog about the scene"}',
   '{}', 'TN-11', 'Tunis', '[]', '00000000-0000-4000-a000-000000000004', now(), now(), '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000004', 'professional', 'demo-ingenieure-son', 'approved', 'Ingénieure du son (démo)',
   '{"fr":"Ingénieure du son fictive","ar":"مهندسة صوت خيالية","en":"Fictional sound engineer"}',
   '{}', 'TN-61', 'Sfax', '[]', '00000000-0000-4000-a000-000000000002', now(), now(), '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000005', 'studio', 'demo-studio-echo', 'pending', 'Studio Écho (démo)',
   '{"fr":"Studio fictif en attente de validation","ar":"استوديو خيالي في انتظار المصادقة","en":"Fictional studio awaiting review"}',
   '{}', 'TN-21', 'Nabeul', '[]', '00000000-0000-4000-a000-000000000006', now(), null, null);

insert into public.profile_managers (profile_id, user_id, role) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000004', 'owner'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000005', 'owner'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000004', 'owner'),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000002', 'owner'),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000006', 'owner');
insert into public.profile_private (profile_id, contact_email)
select id, 'contact+' || slug || '@acf.test' from public.public_profiles where slug like 'demo-%';
insert into public.artist_details (profile_id, kind, formed_year) values ('00000000-0000-4000-b000-000000000001', 'band', 2019);
insert into public.venue_details (profile_id, address, capacity, venue_kind, has_backline)
  values ('00000000-0000-4000-b000-000000000002', 'Adresse fictive', 300, 'club', true);
insert into public.professional_details (profile_id, years_experience, available_for_hire)
  values ('00000000-0000-4000-b000-000000000004', 8, true);
insert into public.studio_details (profile_id, services) values ('00000000-0000-4000-b000-000000000005', '{recording,mixing}');
insert into public.profile_genres (profile_id, genre_id)
select '00000000-0000-4000-b000-000000000001', id from public.genres where slug in ('rock', 'alternative-indie');
insert into public.profile_professions (profile_id, profession_id)
select '00000000-0000-4000-b000-000000000004', id from public.professions where slug in ('sound-engineer', 'mixing-mastering');

-- News in three languages (one translation group) and a blog post.
insert into public.posts (kind, locale, translation_group, slug, title, excerpt, body_md, status, published_at, author_id) values
  ('news', 'fr', '00000000-0000-4000-c000-000000000001', 'demo-bienvenue', 'Bienvenue (article de démonstration)',
   'Un article fictif pour tester le site.', 'Ceci est un **article de démonstration**.', 'published', now(), '00000000-0000-4000-a000-000000000002'),
  ('news', 'ar', '00000000-0000-4000-c000-000000000001', 'demo-bienvenue', 'مرحبًا (مقال تجريبي)',
   'مقال خيالي لتجربة الموقع.', 'هذا **مقال تجريبي**.', 'published', now(), '00000000-0000-4000-a000-000000000002'),
  ('news', 'en', '00000000-0000-4000-c000-000000000001', 'demo-bienvenue', 'Welcome (demo article)',
   'A fictional article to test the site.', 'This is a **demo article**.', 'published', now(), '00000000-0000-4000-a000-000000000002'),
  ('news', 'fr', default, 'demo-brouillon', 'Brouillon (démo)', null, 'Brouillon non publié.', 'draft', null, '00000000-0000-4000-a000-000000000002');
insert into public.posts (kind, blog_profile_id, locale, slug, title, body_md, status, published_at, author_id) values
  ('blog', '00000000-0000-4000-b000-000000000003', 'fr', 'demo-premier-billet', 'Premier billet (démo)',
   'Billet fictif du blog de démonstration.', 'published', now(), '00000000-0000-4000-a000-000000000004');

-- Events: one published (ACF-organized), one proposal from the demo venue.
insert into public.events (id, slug, title, description, starts_at, ends_at, venue_profile_id, governorate_code,
                           is_free, organized_by_acf, status, published_at, published_by) values
  ('00000000-0000-4000-d000-000000000001', 'demo-concert', '{"fr":"Concert de démonstration","ar":"حفل تجريبي","en":"Demo concert"}',
   '{"fr":"Événement fictif.","ar":"حدث خيالي.","en":"Fictional event."}', now() + interval '21 days', now() + interval '21 days 4 hours',
   '00000000-0000-4000-b000-000000000002', 'TN-51', true, true, 'published', now(), '00000000-0000-4000-a000-000000000002');
insert into public.events (slug, title, starts_at, venue_profile_id, governorate_code, status, proposed_by) values
  ('demo-proposition', '{"fr":"Soirée proposée (démo)","ar":"سهرة مقترحة (تجريبية)","en":"Proposed night (demo)"}',
   now() + interval '35 days', '00000000-0000-4000-b000-000000000002', 'TN-51', 'pending', '00000000-0000-4000-a000-000000000005');
insert into public.event_lineup (event_id, profile_id, position) values ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000001', 0);

-- More of the fictional catalogue, so lists, filters and search have something to show (phase 3).
-- One Arabic-named artist exercises Arabic search; one draft profile and one draft event must never
-- appear anywhere public. The YouTube id is a placeholder: the embed loads only on click.
insert into public.public_profiles (id, type, slug, status, display_name, tagline, bio, governorate_code, city,
                                    links, created_by, submitted_at, approved_at, approved_by)
values
  ('00000000-0000-4000-b000-000000000006', 'artist', 'demo-al-amwaj', 'approved', 'الأمواج (تجريبي)',
   '{"ar":"فرقة جاز وفانك خيالية","fr":"Groupe fictif de jazz et funk","en":"Fictional jazz and funk band"}',
   '{"ar":"ملف تجريبي لفرقة غير موجودة.","fr":"Profil de démonstration d’un groupe inexistant.","en":"Demo profile of a band that does not exist."}',
   'TN-61', 'Sfax', '[{"kind":"youtube","url":"https://www.youtube.com/watch?v=demo0000000"},{"kind":"instagram","url":"https://www.instagram.com/example"}]',
   '00000000-0000-4000-a000-000000000004', now(), now(), '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000007', 'venue', 'demo-cave-fictive', 'approved', 'La Cave Fictive (démo)',
   '{"fr":"Club de jazz fictif","ar":"نادي جاز خيالي","en":"Fictional jazz club"}', '{}',
   'TN-11', 'Tunis', '[]', '00000000-0000-4000-a000-000000000005', now(), now(), '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000008', 'studio', 'demo-studio-nuit', 'approved', 'Studio Nuit (démo)',
   '{"fr":"Studio d’enregistrement fictif","ar":"استوديو تسجيل خيالي","en":"Fictional recording studio"}', '{}',
   'TN-21', 'Nabeul', '[]', '00000000-0000-4000-a000-000000000006', now(), now(), '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000009', 'artist', 'demo-brouillon-artiste', 'draft', 'Brouillon Secret (démo)',
   '{"fr":"Ne doit jamais apparaître publiquement"}', '{}', 'TN-11', 'Tunis', '[]',
   '00000000-0000-4000-a000-000000000004', null, null, null);
insert into public.profile_managers (profile_id, user_id, role) values
  ('00000000-0000-4000-b000-000000000006', '00000000-0000-4000-a000-000000000004', 'owner'),
  ('00000000-0000-4000-b000-000000000007', '00000000-0000-4000-a000-000000000005', 'owner'),
  ('00000000-0000-4000-b000-000000000008', '00000000-0000-4000-a000-000000000006', 'owner'),
  ('00000000-0000-4000-b000-000000000009', '00000000-0000-4000-a000-000000000004', 'owner');
insert into public.artist_details (profile_id, kind, formed_year) values
  ('00000000-0000-4000-b000-000000000006', 'band', 2021), ('00000000-0000-4000-b000-000000000009', 'solo', null);
insert into public.venue_details (profile_id, address, capacity, venue_kind, has_backline)
  values ('00000000-0000-4000-b000-000000000007', 'Adresse fictive', 120, 'jazz club', false);
insert into public.studio_details (profile_id, services) values ('00000000-0000-4000-b000-000000000008', '{recording,mixing,mastering}');
insert into public.profile_genres (profile_id, genre_id)
select '00000000-0000-4000-b000-000000000006', id from public.genres where slug in ('jazz', 'funk');

insert into public.events (id, slug, title, description, starts_at, ends_at, venue_profile_id, governorate_code,
                           ticket_url, is_free, organized_by_acf, status, published_at, published_by) values
  ('00000000-0000-4000-d000-000000000002', 'demo-soiree-jazz', '{"fr":"Soirée jazz (démo)","ar":"سهرة جاز (تجريبية)","en":"Jazz night (demo)"}',
   '{"fr":"Soirée fictive à La Cave Fictive.","ar":"سهرة خيالية.","en":"A fictional night."}', now() + interval '10 days', null,
   '00000000-0000-4000-b000-000000000007', 'TN-11', 'https://example.org/demo-tickets', false, false, 'published', now(), '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-d000-000000000003', 'demo-concert-passe', '{"fr":"Concert passé (démo)","ar":"حفل سابق (تجريبي)","en":"Past concert (demo)"}',
   '{"fr":"Un concert fictif déjà passé.","ar":"حفل خيالي مضى.","en":"A fictional concert in the past."}', now() - interval '30 days', null,
   '00000000-0000-4000-b000-000000000007', 'TN-11', null, true, true, 'published', now() - interval '40 days', '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-d000-000000000004', 'demo-evenement-brouillon', '{"fr":"Événement brouillon secret (démo)"}',
   '{}', now() + interval '50 days', null, null, 'TN-11', null, true, true, 'draft', null, null);
insert into public.event_lineup (event_id, profile_id, position) values
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-b000-000000000006', 0),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000006', 0),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-b000-000000000001', 1);

insert into public.posts (kind, locale, translation_group, slug, title, excerpt, body_md, status, published_at, author_id) values
  ('news', 'fr', '00000000-0000-4000-c000-000000000002', 'demo-appel-benevoles', 'Appel à bénévoles (démo)',
   'Un second article fictif.', 'Texte fictif avec un [lien](https://example.org).', 'published', now() - interval '10 days', '00000000-0000-4000-a000-000000000002'),
  ('news', 'ar', '00000000-0000-4000-c000-000000000002', 'demo-appel-benevoles', 'نداء للمتطوعين (تجريبي)',
   'مقال خيالي ثانٍ.', 'نص خيالي مع [رابط](https://example.org).', 'published', now() - interval '10 days', '00000000-0000-4000-a000-000000000002'),
  ('news', 'en', '00000000-0000-4000-c000-000000000002', 'demo-appel-benevoles', 'Call for volunteers (demo)',
   'A second fictional article.', 'Fictional text with a [link](https://example.org).', 'published', now() - interval '10 days', '00000000-0000-4000-a000-000000000002');
insert into public.posts (kind, blog_profile_id, locale, slug, title, excerpt, body_md, status, published_at, author_id) values
  ('blog', '00000000-0000-4000-b000-000000000003', 'ar', 'demo-tadwina', 'تدوينة تجريبية', 'تدوينة خيالية.',
   'نص **تدوينة** خيالية.', 'published', now() - interval '2 days', '00000000-0000-4000-a000-000000000004'),
  ('blog', '00000000-0000-4000-b000-000000000003', 'en', 'demo-first-post', 'First post (demo)', 'A fictional blog post.',
   'A fictional **blog** post.', 'published', now() - interval '2 days', '00000000-0000-4000-a000-000000000004'),
  ('blog', '00000000-0000-4000-b000-000000000003', 'fr', 'demo-billet-brouillon', 'Billet brouillon secret (démo)', null,
   'Jamais public.', 'draft', null, '00000000-0000-4000-a000-000000000004');

-- Member space.
insert into public.meetings (title, description_md, starts_at, ends_at, location_text, audience) values
  ('Assemblée de démonstration', 'Ordre du jour fictif.', now() + interval '10 days', now() + interval '10 days 2 hours', 'Lieu fictif', 'member'),
  ('Réunion du bureau (démo)', 'Points fictifs.', now() + interval '5 days', now() + interval '5 days 1 hour', 'En ligne', 'board');
insert into public.projects (id, name, status, starts_on) values ('00000000-0000-4000-e000-000000000001', 'Festival de démonstration', 'active', current_date);
insert into public.project_budgets (project_id, total_planned_millimes, notes) values ('00000000-0000-4000-e000-000000000001', 12000000, 'Budget fictif');
insert into public.budget_lines (project_id, category, label, planned_millimes) values
  ('00000000-0000-4000-e000-000000000001', 'sound', 'Sonorisation (démo)', 4500000),
  ('00000000-0000-4000-e000-000000000001', 'communication', 'Affiches (démo)', 800000);
insert into public.tasks (title, description_md, audience, is_open, project_id, due_on) values
  ('Préparer les affiches (démo)', 'Tâche fictive ouverte aux bénévoles.', 'member', true, '00000000-0000-4000-e000-000000000001', current_date + 14),
  ('Valider le budget (démo)', 'Tâche fictive du bureau.', 'board', false, '00000000-0000-4000-e000-000000000001', current_date + 7);
insert into public.announcements (audience, title, body_md, source) values
  ('member', 'Annonce de démonstration', 'Message fictif pour les membres.', 'board'),
  ('board', 'Note du bureau (démo)', 'Message fictif pour le bureau.', 'board');
insert into public.polls (id, title, kind, audience, closes_at) values
  ('00000000-0000-4000-f000-000000000001', 'Date de la répétition (démo)', 'availability', 'member', now() + interval '7 days');
insert into public.poll_options (poll_id, label, starts_at, ends_at, position) values
  ('00000000-0000-4000-f000-000000000001', 'Samedi', now() + interval '12 days', now() + interval '12 days 3 hours', 0),
  ('00000000-0000-4000-f000-000000000001', 'Dimanche', now() + interval '13 days', now() + interval '13 days 3 hours', 1);
insert into public.volunteer_shifts (event_id, role_label, starts_at, ends_at, capacity) values
  ('00000000-0000-4000-d000-000000000001', '{"fr":"Accueil","ar":"الاستقبال","en":"Front desk"}', now() + interval '21 days', now() + interval '21 days 2 hours', 3),
  ('00000000-0000-4000-d000-000000000001', '{"fr":"Bar","ar":"المشرب","en":"Bar"}', now() + interval '21 days 2 hours', now() + interval '21 days 4 hours', 2);

-- Board space (amounts in millimes).
insert into public.ledger_periods (label, starts_on, ends_on) values
  ('Exercice de démonstration', date_trunc('year', current_date)::date, (date_trunc('year', current_date) + interval '1 year - 1 day')::date);
insert into public.ledger_entries (entry_date, direction, amount_millimes, category, project_id, counterparty, payment_method, description) values
  (current_date, 'income', 1500000, 'subsidy', '00000000-0000-4000-e000-000000000001', 'Donateur fictif', 'bank_transfer', 'Recette de démonstration'),
  (current_date, 'expense', 450000, 'sound', '00000000-0000-4000-e000-000000000001', 'Prestataire fictif', 'cash', 'Dépense de démonstration');
insert into public.correspondence (subject, counterpart, status) values
  ('Demande d’autorisation (démo)', 'Autorité de tutelle (fictif)', 'draft');

insert into public.site_settings (key, value, is_public) values
  ('site.demo_banner', '{"fr":"Données de démonstration","ar":"بيانات تجريبية","en":"Demo data"}', true);

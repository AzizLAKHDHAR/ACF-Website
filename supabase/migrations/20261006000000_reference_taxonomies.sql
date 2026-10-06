-- Reference data every environment needs (production included): Tunisia's 24 governorates and the
-- genre and profession taxonomies, in ar/fr/en. Moved here from seed.sql, which never reaches production
-- (D-060). Idempotent: rows that already exist (e.g. added by an admin) are left alone; admins edit them
-- afterwards through the app, so later changes are data, not migrations.

-- ISO 3166-2:TN codes.
insert into public.governorates (code, name, position) values
  ('TN-11', '{"ar":"تونس","fr":"Tunis","en":"Tunis"}', 1),
  ('TN-12', '{"ar":"أريانة","fr":"Ariana","en":"Ariana"}', 2),
  ('TN-13', '{"ar":"بن عروس","fr":"Ben Arous","en":"Ben Arous"}', 3),
  ('TN-14', '{"ar":"منوبة","fr":"La Manouba","en":"Manouba"}', 4),
  ('TN-21', '{"ar":"نابل","fr":"Nabeul","en":"Nabeul"}', 5),
  ('TN-22', '{"ar":"زغوان","fr":"Zaghouan","en":"Zaghouan"}', 6),
  ('TN-23', '{"ar":"بنزرت","fr":"Bizerte","en":"Bizerte"}', 7),
  ('TN-31', '{"ar":"باجة","fr":"Béja","en":"Beja"}', 8),
  ('TN-32', '{"ar":"جندوبة","fr":"Jendouba","en":"Jendouba"}', 9),
  ('TN-33', '{"ar":"الكاف","fr":"Le Kef","en":"Kef"}', 10),
  ('TN-34', '{"ar":"سليانة","fr":"Siliana","en":"Siliana"}', 11),
  ('TN-41', '{"ar":"القيروان","fr":"Kairouan","en":"Kairouan"}', 12),
  ('TN-42', '{"ar":"القصرين","fr":"Kasserine","en":"Kasserine"}', 13),
  ('TN-43', '{"ar":"سيدي بوزيد","fr":"Sidi Bouzid","en":"Sidi Bouzid"}', 14),
  ('TN-51', '{"ar":"سوسة","fr":"Sousse","en":"Sousse"}', 15),
  ('TN-52', '{"ar":"المنستير","fr":"Monastir","en":"Monastir"}', 16),
  ('TN-53', '{"ar":"المهدية","fr":"Mahdia","en":"Mahdia"}', 17),
  ('TN-61', '{"ar":"صفاقس","fr":"Sfax","en":"Sfax"}', 18),
  ('TN-71', '{"ar":"قفصة","fr":"Gafsa","en":"Gafsa"}', 19),
  ('TN-72', '{"ar":"توزر","fr":"Tozeur","en":"Tozeur"}', 20),
  ('TN-73', '{"ar":"قبلي","fr":"Kébili","en":"Kebili"}', 21),
  ('TN-81', '{"ar":"قابس","fr":"Gabès","en":"Gabes"}', 22),
  ('TN-82', '{"ar":"مدنين","fr":"Médenine","en":"Medenine"}', 23),
  ('TN-83', '{"ar":"تطاوين","fr":"Tataouine","en":"Tataouine"}', 24)
on conflict (code) do nothing;

-- The 11 genres of the legacy catalogue (docs/audit.md) plus funk, named on ACF's one-pager (D-053).
insert into public.genres (slug, name, position) values
  ('rock', '{"ar":"روك","fr":"Rock","en":"Rock"}', 1),
  ('jazz', '{"ar":"جاز","fr":"Jazz","en":"Jazz"}', 2),
  ('metal', '{"ar":"ميتال","fr":"Metal","en":"Metal"}', 3),
  ('funk', '{"ar":"فانك","fr":"Funk","en":"Funk"}', 4),
  ('alternative-indie', '{"ar":"بديل / مستقل","fr":"Alternatif / Indé","en":"Alternative / Indie"}', 5),
  ('hip-hop-rap', '{"ar":"هيب هوب / راب","fr":"Hip-hop / Rap","en":"Hip Hop / Rap"}', 6),
  ('electronic', '{"ar":"إلكتروني","fr":"Électronique","en":"Electronic"}', 7),
  ('reggae-dub', '{"ar":"ريغي / دَب","fr":"Reggae / Dub","en":"Reggae / Dub"}', 8),
  ('pop', '{"ar":"بوب","fr":"Pop","en":"Pop"}', 9),
  ('classical-instrumental', '{"ar":"كلاسيكي / آلي","fr":"Classique / Instrumental","en":"Classical / Instrumental"}', 10),
  ('traditional-folk', '{"ar":"تقليدي / شعبي","fr":"Traditionnel / Folk","en":"Traditional / Folk"}', 11),
  ('soundtracks-scores', '{"ar":"موسيقى تصويرية","fr":"Bandes originales","en":"Soundtracks / Scores"}', 12)
on conflict (slug) do nothing;

insert into public.professions (slug, name, position) values
  ('sound-engineer', '{"ar":"مهندس صوت","fr":"Ingénieur·e du son","en":"Sound engineer"}', 1),
  ('mixing-mastering', '{"ar":"مكساج وماسترينغ","fr":"Mixage et mastering","en":"Mixing and mastering"}', 2),
  ('music-producer', '{"ar":"منتج موسيقي","fr":"Producteur·rice","en":"Music producer"}', 3),
  ('lighting-technician', '{"ar":"تقني إضاءة","fr":"Éclairagiste","en":"Lighting technician"}', 4),
  ('stage-technician', '{"ar":"تقني ركح","fr":"Technicien·ne plateau","en":"Stage technician"}', 5),
  ('backline-technician', '{"ar":"تقني معدات","fr":"Backliner","en":"Backline technician"}', 6),
  ('artist-manager', '{"ar":"مدير أعمال فنان","fr":"Manager d’artiste","en":"Artist manager"}', 7),
  ('booking-agent', '{"ar":"وكيل حجوزات","fr":"Agent·e de booking","en":"Booking agent"}', 8),
  ('tour-manager', '{"ar":"مدير جولات","fr":"Régisseur·se de tournée","en":"Tour manager"}', 9),
  ('concert-promoter', '{"ar":"منظم حفلات","fr":"Organisateur·rice de concerts","en":"Concert promoter"}', 10),
  ('photographer', '{"ar":"مصور فوتوغرافي","fr":"Photographe","en":"Photographer"}', 11),
  ('videographer', '{"ar":"مصور فيديو","fr":"Vidéaste","en":"Videographer"}', 12),
  ('graphic-designer', '{"ar":"مصمم غرافيك","fr":"Graphiste","en":"Graphic designer"}', 13),
  ('music-journalist', '{"ar":"صحفي موسيقي","fr":"Journaliste musical·e","en":"Music journalist"}', 14),
  ('music-teacher', '{"ar":"مدرس موسيقى","fr":"Professeur·e de musique","en":"Music teacher"}', 15),
  ('instrument-maker', '{"ar":"صانع آلات موسيقية","fr":"Luthier·ère","en":"Instrument maker"}', 16)
on conflict (slug) do nothing;

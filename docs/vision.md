# Vision

## Who we are

**ACF — Amplify Creative Foundation** is a Tunisian association and *a home for Tunisia's alternative
music scene*. In its own words ([`/brand`](../brand) one-pager): it was born from a need to recognize
the music that lives outside the mainstream — rap, tarab and Arab pop already have their stages; rock,
jazz, metal, funk and every alternative sound deserve theirs. It stands for an inclusive, safe, fair,
autonomous and decentralized scene, acts on three axes (financial, artistic, educational) and counts
individuals and university music clubs among its members. The association works under the oversight of
a supervising authority, referred to here as **"al wichah thakafi"** (official name and spelling to be
confirmed).

This repository used to host *Tunisia Music Scene / AltScene TN*, a community archive of Tunisian
artists. ACF is taking it over and rebuilding it around a new vision, a new graphic charter and a
new user model.

## What the website is for

The site does two jobs.

1. **A public window on the Tunisian scene.** News from the scene, blogs, and searchable
   catalogues of **artists**, **professionals** (sound engineers, technicians, lighting, stage,
   photography, management…), **venues and studios**, and **events**. The people and places in
   those catalogues maintain their own profiles, and ACF approves them.
2. **The association's internal operating system.** Hidden spaces where members coordinate
   (meetings, tasks, announcements, polls, volunteering, documents), where the board runs the
   association (tasks, finances, legal vault, correspondence with the supervising authority), and
   where the administrator manages users, approvals, moderation and settings.

## Audiences

| Audience | What they come for |
|---|---|
| Visitors: fans, press, festival programmers, partners abroad | Discover artists, find events, read news and blogs, find a venue, studio or technician |
| Scene actors: artists, professionals, venue owners, studio owners, blog owners | A free, credible public profile; publishing events or blog posts; being found |
| ACF members | Know what's happening, RSVP to meetings, pick up tasks, volunteer at events, find documents |
| ACF board | Plan and assign work, keep the books, keep legal documents safe, track every exchange with the supervising authority |
| ACF administrator | Keep the platform healthy: who has access to what, what gets published, what happened and when |

## The four interfaces

1. **Public:** news, blogs, catalogues (artists, professionals, venues & studios), events.
   Fully trilingual and indexable.
2. **Members (hidden):** meeting reminders and RSVP, task assignment, an announcements feed
   (board posts plus messages synced from a Discord channel), availability polls, volunteer
   sign-up for events, document library.
3. **Board (hidden, above members):** create and assign tasks; finances (ledger, budgets per
   project, receipts, exports); legal document vault; correspondence tracker for the supervising
   authority. The tracker covers emailing documents and requesting signatures, and follows each
   item through draft → sent → awaiting signature → signed → archived.
4. **Admin (highest):** user and role management, profile approval queue, moderation, audit log,
   analytics, site settings.

## User model

Two independent axes:

- **Public profile types** describe what someone *is in the scene*: artist, professional, venue owner,
  studio owner, blog owner. A user can hold **several** (for example, a musician who also runs a studio).
  Each profile is reviewed by the admin before it becomes public.
- **Association roles** describe what someone *does in ACF*. They are hierarchical:
  **member < board < admin**. Each role includes everything the role below it can do.

A user can have public profiles, an association role, both, or neither. A board member who is also
a sound engineer has a `professional` profile **and** the `board` role. A venue owner with no link to
ACF has a `venue` profile and **no** role. Roles are granted only by the admin and never through
self-service.

Details: [`roles.md`](roles.md) (permission matrix) and [`architecture.md`](architecture.md) (data model).

## Principles

1. **Trilingual by default.** Arabic (right-to-left), French and English are first-class. No page ships
   in one language only, and layouts are built to mirror for RTL.
2. **True and consented.** No invented data. Public profiles are created or claimed by the people
   they describe (or entered by ACF with their consent) and approved before publication.
3. **Secure by construction.** Every table is protected by database row-level security. The browser
   is never trusted to decide who may see or change what.
4. **Free to run.** The whole platform runs on free tiers (hosting, database, email, cron), so the
   association pays nothing per month beyond a domain name.
5. **Maintainable by volunteers.** A small, mainstream stack, documented decisions, and one
   reviewable pull request per work session.
6. **Fast and accessible.** Works well on a mid-range phone on a mobile network, meets WCAG 2.2 AA,
   and is usable with a keyboard and a screen reader in all three languages.

## Non-goals (for the first release)

- Selling tickets or processing payments. Events link out to the organiser's ticketing.
- Hosting audio or video. Profiles embed or link to YouTube, Spotify, SoundCloud, Bandcamp, etc.
- Replacing Discord as the members' chat. The site mirrors one announcements channel; it is not
  a chat.
- Public social features (comments, likes, follows, direct messages).
- Native mobile apps. The site is responsive; a PWA can come later.

## What success looks like

- Every artist, professional, venue and studio in the catalogue has an approved, accurate profile
  in at least one language, and the catalogue keeps growing without the admin entering data.
- Upcoming events in the scene are listed on the site.
- Members RSVP, sign up for shifts and pick up tasks on the site instead of in scattered chats.
- The board's ledger is complete and exportable, and every exchange with the supervising authority
  has a traceable status.
- Monthly running cost: **0** (plus the domain).

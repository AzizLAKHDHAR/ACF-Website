# Roles and permissions

This document is the **source of truth for authorization**. Every cell below must be enforced by a
Row Level Security (RLS) policy or a storage policy in Postgres. The UI may hide buttons for
convenience, but hiding is never the control. When this matrix changes, the RLS policies and
their tests change in the same PR (see `CLAUDE.md` → Security rules).

## Actors

Two independent axes ([`vision.md`](vision.md) → User model):

**Association roles** (hierarchical; each row includes every permission of the rows above it):

| Role | Who | Granted by |
|---|---|---|
| *Anonymous* | Any visitor, not signed in | — |
| *Registered* | Any signed-in user with no association role | Self sign-up |
| **member** | ACF member | Admin |
| **board** | Member of ACF's board (bureau) | Admin |
| **admin** | Platform administrator (currently one person) | Admin; the first admin is set by seed/SQL |

**Public profile types** (a user may hold several; they are scoped to *rows the user manages*):

| Profile type | Catalogue | Extra capabilities when **approved** |
|---|---|---|
| `artist` | Artists | Propose events they perform at |
| `professional` | Professionals | — |
| `venue` (venue owner) | Venues & studios | Propose events at their venue |
| `studio` (studio owner) | Venues & studios | — |
| `blog` (blog owner) | Blogs | Publish blog posts under their blog |

A profile has one or more **managers** (`profile_managers`), so a band can be managed by several
members, and a venue by its owner plus staff. "Own" below means *a profile the user manages*.
Profile type and association role never imply each other. An admin does **not** automatically
manage someone's profile, but can moderate any profile.

The **system** actor (service-role key, used only by server-side cron jobs and verified webhooks)
bypasses RLS. Its uses are listed at the end of this document.

## Legend

`R` read · `C` create · `U` update · `D` delete · `—` no access.
Qualifiers: **own** = rows the user manages or authored · **pub** = published/approved rows only ·
**aud** = rows whose audience includes the user's role · **asg** = rows assigned to the user.
Inheritance: each association role also has every permission of the roles to its left.
"Owner" columns apply on top of the user's association role.

## 1. Public content

| Resource | Anonymous | Registered | Profile owner (own) | member | board | admin |
|---|---|---|---|---|---|---|
| Public profiles: approved (`public_profiles`, type details, genres, links) | R pub | R pub | R pub | R pub | R pub | R, U, D (moderation) |
| Public profiles: draft / pending / rejected / suspended | — | C (new draft) | R, U own; submit for review; D own drafts | — | — | R all |
| Profile approval (status → approved / rejected / suspended) | — | — | — | — | — | U |
| Profile private contact details (`profile_private`) | — | — | R, U own | — | — | R |
| Profile managers (invite or remove co-managers) | — | — | C, D own profile | — | — | C, D |
| Events: published | R pub | R pub | R pub | R pub | R pub | R |
| Events: proposals | — | — | C (approved artist/venue, only for own venue or own lineup); R, U own while pending | — | R, U, publish, D | R, U, D |
| ACF news posts (`posts.kind = news`) | R pub | R pub | — | R pub | C, R, U, D, publish | C, R, U, D |
| Blog posts (`posts.kind = blog`) | R pub | R pub | C, R, U, D own (approved blog only); publish directly | R pub | R pub | R, U (unpublish), D |
| Taxonomies (genres, professions, cities) | R | R | R | R | R | C, U, D |
| Moderation reports (flag a profile, post or event) | — | C | C | C | C | R, U (resolve) |
| Public media uploads (avatars, covers, post images) | R | — | C, U, D in own profile folder | — | C, D (news/events) | C, D any |
| Public site settings (contact, socials, banner) | R | R | R | R | R | U |

Notes:
- New profiles start as `draft`. The owner submits (`pending`); the admin approves or rejects with a
  reason. Editing an **approved** profile's public fields keeps it public; the admin can suspend it.
  Whether edits need re-approval is an open question (default: no, post-hoc moderation).
- A blog profile must be approved before its posts can be published. After that, its posts publish
  immediately and are moderated after the fact.

## 2. Account (any signed-in user)

| Resource | Registered (own) | member | board | admin |
|---|---|---|---|---|
| Own account (`accounts`: display name, avatar, preferred locale, phone) | R, U | (same) | (same) | R all, U (deactivate) |
| Own association role (`memberships`) | R own | R own | R own | C, R, U, D all |
| Own notifications | R, U (mark read) | (same) | (same) | (same) |
| Delete own account | request (soft delete + anonymize) | (same) | (same) | executes / processes |

## 3. Member space (hidden)

| Resource | Registered | member | board | admin |
|---|---|---|---|---|
| Member directory (display names, avatars, roles) | — | R | R (+ contact details) | R, U |
| Meetings | — | R aud | C, R, U, D | C, R, U, D |
| Meeting RSVP | — | C, R, U own; R counts | R all (attendance list) | R all |
| Tasks | — | R aud (members-visible) + R asg; U status/comment on asg; self-assign if task is `open` | C, R, U, D; assign anyone | C, R, U, D |
| Task comments | — | C own on tasks they can read; U, D own | C; D any | C; D any |
| Announcements feed | — | R aud | C, R, U, D; push to Discord | C, R, U, D |
| Discord-synced announcements | — | R aud | R, D (hide) | R, D |
| Availability polls | — | R aud; C, U own vote; R results | C, R, U, D polls | C, R, U, D |
| Volunteer shifts (per event) | — | R; C, D own sign-up | C, R, U, D shifts; R all sign-ups | C, R, U, D |
| Document library (`documents.collection = library`) | — | R aud | C, R, U, D | C, R, U, D |

## 4. Board space (hidden)

| Resource | member | board | admin |
|---|---|---|---|
| Projects (name, status, dates) | R (names only, for task context) | C, R, U, D | C, R, U, D |
| Project budgets and budget lines | — | C, R, U, D | C, R, U, D |
| Ledger entries | — | C, R; U while the period is open; void (reversal entry) | C, R, U; D (soft delete, audited); close/reopen period |
| Receipts (files attached to ledger entries) | — | C, R; D while the entry is unlocked | C, R, D |
| Finance exports (CSV/XLSX by period or project) | — | C (generate), R | C, R |
| Legal vault (`documents.collection = legal`) | — | C, R, U | C, R, U, D |
| Correspondence with the supervising authority | — | C, R, U; move status forward; D drafts only | C, R, U, D; move status backward (override, audited) |
| Correspondence documents (originals, signed copies) | — | C, R; D on drafts only | C, R, D |
| Signature requests (send / remind / cancel) | — | C, U | C, U |

Correspondence status machine (enforced in the database):
`draft → sent → awaiting_signature → signed → archived`. Only forward moves are allowed, except that the
admin may move an item back (audited). `archived` is read-only.

## 5. Admin space (hidden)

| Resource | admin | everyone else |
|---|---|---|
| Users and roles (grant/revoke member, board, admin; deactivate) | C, R, U, D | — |
| Invitations to the association | C, R, D | — |
| Profile approval queue | R, U | — |
| Moderation queue (reports, unpublish, suspend) | R, U | — |
| Audit log | R | — (no one may U or D; rows are written only by triggers) |
| Analytics dashboard | R | — |
| Site settings (all keys, including private ones) | R, U | — |
| Integration settings and status (Discord, email, signature) | R, U | — |

## Guard rails (enforced in the database, not just the UI)

1. **No self-escalation.** `memberships` has no insert/update policy for non-admins. Role changes go
   through an admin-only path and are written to the audit log.
2. **Last admin.** A trigger prevents demoting, deactivating or deleting the last active admin.
3. **Private columns live in private tables.** RLS works on rows, not columns. Data that must not be
   public (phone numbers, emails, budget amounts, rejection notes) lives in a separate table with
   its own policies, never in a public table "hidden by the select list".
4. **Status transitions are validated server-side.** Profile approval, event publication,
   correspondence status and ledger period locks use `SECURITY DEFINER` functions or triggers that
   re-check the caller's role.
5. **Audience checks use the database role.** Meetings, announcements, polls and documents carry an
   `audience` (`member` / `board`), compared with the caller's role in SQL.
6. **Suspended or deactivated users have no role.** Only `memberships.status = 'active'` counts.
7. **Sensitive board data may require MFA.** *Planned (open question):* finance, legal vault and
   correspondence policies also require `aal2`, i.e. a TOTP second factor.

## Enforcement and tests

Every cell above is enforced in `supabase/migrations/` (policies, column grants, SECURITY DEFINER functions and
triggers; see architecture §7) and tested for allowed **and** denied access in `supabase/tests/database/`:

| Section | Test file |
|---|---|
| RLS on every table, grants, hardened functions, buckets | `001-structure.test.sql` |
| §1 Public content | `010-public-content.test.sql` |
| §2 Account (incl. invitations) | `020-account.test.sql` |
| §3 Member space (incl. suspended and deactivated members) | `030-member-space.test.sql` |
| §4 Board space | `040-board-space.test.sql` |
| §5 Admin space and Guard rails 1–6 | `050-admin-and-guard-rails.test.sql` |
| Storage buckets | `060-storage.test.sql` |
| Volunteer capacity under concurrent sign-ups | `supabase/tests/concurrency/volunteer-capacity.sh` |

Implementation details that the matrix leaves open: co-managers of a profile see each other, and any manager may
leave a profile (never its last owner); internal review notes are admin-only (`review_event_notes`); members read
project names, dates and status, while descriptions and amounts are board-only (`project_budgets`).

## System actor (service role): allowed uses

The service-role key bypasses RLS. It may be used only in these places, and only in server-only modules:

| Use | Why RLS can't be used |
|---|---|
| Discord inbound sync (cron) | Inserts announcements with no human author |
| Reminder and notification jobs (cron) | Reads RSVPs and shifts across all users to send emails |
| E-signature webhook handler | The provider calls us; no user session. The request signature is verified first |
| Account deletion (anonymization) | Needs `auth.admin` API |
| Seeding and migrations | Bootstrap |

Any new use must be added to this table in the same PR.

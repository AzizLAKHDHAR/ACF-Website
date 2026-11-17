import type { Json } from '@/types/database';

// How an in-app notification reads and where it leads. Payloads are written by database triggers and
// RPCs only (users can't insert notifications), but ids are still checked before they become links.

export type NotificationKey =
  | 'announcement'
  | 'taskAssigned'
  | 'meetingScheduled'
  | 'meetingCancelled'
  | 'profileApproved'
  | 'profileRejected'
  | 'profileSuspended'
  | 'profileReinstated'
  | 'profileSubmitted'
  | 'other';

export type NotificationView = {
  key: NotificationKey;
  href: string | null;
  /** Placeholders of the message (`{title}`, `{name}`); user-written, so rendered with dir="auto". */
  values: { title: string; name: string };
  /** The public note of a profile decision, when there is one. */
  note: string | null;
};

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(payload: Record<string, Json | undefined>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

function idOf(payload: Record<string, Json | undefined>, key: string): string | null {
  const value = text(payload, key);
  return ID.test(value) ? value : null;
}

const decisions: Record<string, NotificationKey> = {
  approved: 'profileApproved',
  rejected: 'profileRejected',
  suspended: 'profileSuspended',
  reinstated: 'profileReinstated',
};

export function describeNotification(kind: string, payload: Json): NotificationView {
  const data =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, Json | undefined>)
      : {};
  const values = { title: text(data, 'title'), name: text(data, 'display_name') };
  const view = (key: NotificationKey, href: string | null, note: string | null = null) => ({
    key,
    href,
    values,
    note,
  });

  switch (kind) {
    case 'announcement_published':
      return view('announcement', '/member/announcements');
    case 'task_assigned': {
      const task = idOf(data, 'task_id');
      return view('taskAssigned', task ? `/member/tasks/${task}` : '/member/tasks');
    }
    case 'meeting_scheduled':
    case 'meeting_cancelled': {
      const meeting = idOf(data, 'meeting_id');
      return view(
        kind === 'meeting_scheduled' ? 'meetingScheduled' : 'meetingCancelled',
        meeting ? `/member/meetings/${meeting}` : '/member/meetings',
      );
    }
    case 'profile_review': {
      const profile = idOf(data, 'profile_id');
      const key = decisions[text(data, 'decision')] ?? 'other';
      return view(
        key,
        profile ? `/account/profiles/${profile}` : '/account/profiles',
        text(data, 'note_public') || null,
      );
    }
    case 'profile_submitted':
      return view('profileSubmitted', '/admin/approvals');
    default:
      return view('other', null);
  }
}

import { describe, expect, it } from 'vitest';
import { describeNotification } from './describe';

const ID = '00000000-0000-4000-e000-000000000101';

describe('describeNotification', () => {
  it('links member-space notifications to their page', () => {
    expect(describeNotification('task_assigned', { task_id: ID, title: 'Affiches' })).toEqual({
      key: 'taskAssigned',
      href: `/member/tasks/${ID}`,
      values: { title: 'Affiches', name: '' },
      note: null,
    });
    expect(describeNotification('meeting_scheduled', { meeting_id: ID, title: 'AG' }).href).toBe(
      `/member/meetings/${ID}`,
    );
    expect(describeNotification('meeting_cancelled', { meeting_id: ID }).key).toBe(
      'meetingCancelled',
    );
    expect(describeNotification('announcement_published', { title: 'Info' })).toMatchObject({
      key: 'announcement',
      href: '/member/announcements',
    });
  });

  it('describes profile decisions with their public note', () => {
    expect(
      describeNotification('profile_review', {
        profile_id: ID,
        display_name: 'Les Pixels',
        decision: 'rejected',
        note_public: 'Ajoutez une biographie.',
      }),
    ).toEqual({
      key: 'profileRejected',
      href: `/account/profiles/${ID}`,
      values: { title: '', name: 'Les Pixels' },
      note: 'Ajoutez une biographie.',
    });
    expect(describeNotification('profile_submitted', { display_name: 'X' }).href).toBe(
      '/admin/approvals',
    );
  });

  it('never builds a link from something that is not an id', () => {
    expect(describeNotification('task_assigned', { task_id: '../admin' }).href).toBe(
      '/member/tasks',
    );
    expect(
      describeNotification('profile_review', { profile_id: 42, decision: 'approved' }).href,
    ).toBe('/account/profiles');
  });

  it('falls back for unknown kinds and odd payloads', () => {
    expect(describeNotification('test', null)).toEqual({
      key: 'other',
      href: null,
      values: { title: '', name: '' },
      note: null,
    });
    expect(describeNotification('profile_review', { decision: 'exploded' }).key).toBe('other');
    expect(describeNotification('announcement_published', ['x']).values.title).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import { isOverdue } from '@/features/tasks/status';
import { isMeetingOpen } from './status';

const now = Date.parse('2026-11-17T12:00:00Z');

describe('isMeetingOpen', () => {
  it('takes answers until the meeting ends (or starts, without an end)', () => {
    const meeting = { starts_at: '2026-11-17T11:00:00Z', cancelled_at: null };
    expect(isMeetingOpen({ ...meeting, ends_at: '2026-11-17T13:00:00Z' }, now)).toBe(true);
    expect(isMeetingOpen({ ...meeting, ends_at: '2026-11-17T11:30:00Z' }, now)).toBe(false);
    expect(isMeetingOpen({ ...meeting, ends_at: null }, now)).toBe(false);
    expect(
      isMeetingOpen({ ...meeting, starts_at: '2026-11-18T09:00:00Z', ends_at: null }, now),
    ).toBe(true);
  });

  it('never takes answers once cancelled', () => {
    expect(
      isMeetingOpen(
        { starts_at: '2026-12-01T09:00:00Z', ends_at: null, cancelled_at: '2026-11-17T10:00:00Z' },
        now,
      ),
    ).toBe(false);
  });
});

describe('isOverdue', () => {
  it('flags active tasks past their due day', () => {
    expect(isOverdue({ due_on: '2026-11-16', status: 'todo' }, '2026-11-17')).toBe(true);
    expect(isOverdue({ due_on: '2026-11-17', status: 'in_progress' }, '2026-11-17')).toBe(false);
    expect(isOverdue({ due_on: '2026-11-16', status: 'done' }, '2026-11-17')).toBe(false);
    expect(isOverdue({ due_on: '2026-11-16', status: 'cancelled' }, '2026-11-17')).toBe(false);
    expect(isOverdue({ due_on: null, status: 'todo' }, '2026-11-17')).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockSessionClient } = vi.hoisted(() => ({
  mockSessionClient: vi.fn(),
}));
vi.mock('@/lib/supabase/session', () => ({
  sessionClient: mockSessionClient,
  throwIfError: (error: { message: string } | null) => {
    if (error) throw new Error(error.message);
  },
}));

import { listUpcomingShifts } from './queries';

describe('listUpcomingShifts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses shift, count and signup queries instead of the overview RPC', async () => {
    const shift = {
      id: 'shift-1',
      event_id: 'event-1',
      role_label: { fr: 'Accueil' },
      starts_at: '2026-11-18T10:00:00.000Z',
      ends_at: '2026-11-18T12:00:00.000Z',
      capacity: 4,
    };
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'volunteer_shifts') {
          return {
            select: vi.fn(() => ({
              gt: vi.fn(() => ({
                order: vi.fn(async () => ({ data: [shift], error: null })),
              })),
            })),
          };
        }
        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [
                  {
                    id: 'event-1',
                    slug: 'concert',
                    title: { fr: 'Concert' },
                    starts_at: '2026-11-18T10:00:00.000Z',
                  },
                ],
                error: null,
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [{ shift_id: 'shift-1' }],
                error: null,
              })),
            })),
          })),
        };
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'volunteer_shift_counts') {
          return {
            data: [{ shift_id: 'shift-1', taken: 2, capacity: 4 }],
            error: null,
          };
        }
        return { data: null, error: { message: 'unexpected RPC' } };
      }),
    };
    mockSessionClient.mockResolvedValue(supabase);

    await expect(listUpcomingShifts()).resolves.toMatchObject([
      {
        shift_id: 'shift-1',
        taken: 2,
        signed_up: true,
        event: { slug: 'concert' },
      },
    ]);
    expect(supabase.rpc).not.toHaveBeenCalledWith('volunteer_shift_overview');
  });
});

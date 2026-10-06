import { describe, expect, it } from 'vitest';
import { parseListParams, toQuery } from './params';

describe('list params', () => {
  it('parses valid filters', () => {
    expect(
      parseListParams({
        page: '2',
        q: ' jazz ',
        genre: 'hip-hop-rap',
        governorate: 'TN-11',
        when: 'past',
      }),
    ).toEqual({
      page: 2,
      q: 'jazz',
      genre: 'hip-hop-rap',
      governorate: 'TN-11',
      when: 'past',
    });
  });

  it('drops malformed values instead of failing', () => {
    expect(
      parseListParams({
        page: '-3',
        genre: 'DROP TABLE',
        governorate: 'XX',
        when: 'soon',
        from: '2026-1-1',
      }),
    ).toEqual({
      page: 1,
    });
    expect(parseListParams({ page: ['4', '5'] }).page).toBe(4);
  });

  it('builds pagination queries without defaults', () => {
    expect(toQuery({ page: 1, genre: 'rock' }, { page: 3 })).toEqual({ page: '3', genre: 'rock' });
    expect(toQuery({ page: 2, genre: 'rock' }, { page: 1 })).toEqual({ genre: 'rock' });
  });
});

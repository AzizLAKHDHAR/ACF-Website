import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { secretsMatch } = await import('./secrets');

describe('secretsMatch', () => {
  it('accepts only the exact secret', () => {
    expect(secretsMatch('s3cret-value', 's3cret-value')).toBe(true);
    expect(secretsMatch('s3cret-valuE', 's3cret-value')).toBe(false);
    expect(secretsMatch('short', 's3cret-value')).toBe(false);
  });

  it('refuses when either side is missing', () => {
    expect(secretsMatch(null, 's3cret-value')).toBe(false);
    expect(secretsMatch('s3cret-value', undefined)).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
  });
});

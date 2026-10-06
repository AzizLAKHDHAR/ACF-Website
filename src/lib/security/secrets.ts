import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Constant-time comparison of a presented secret with the expected one (CLAUDE.md → Security rule 9). */
export function secretsMatch(
  presented: string | null | undefined,
  expected: string | undefined,
): boolean {
  if (!presented || !expected) return false;
  // Hash both sides so the comparison has a fixed length and leaks nothing about the secret's length.
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

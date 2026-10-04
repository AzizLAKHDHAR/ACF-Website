import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse, wcagContrast } from 'culori';
import { describe, expect, it } from 'vitest';
import { resolveTokens, type Theme } from './tokens';

const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

// WCAG 2.2 AA: 4.5:1 for text (1.4.3), 3:1 for UI components and focus indicators (1.4.11).
const TEXT = 4.5;
const NON_TEXT = 3;

// An optional fourth element limits a pair to one theme.
const pairs: Array<[foreground: string, background: string, minimum: number, only?: Theme]> = [
  ['--foreground', '--background', TEXT],
  ['--card-foreground', '--card', TEXT],
  ['--popover-foreground', '--popover', TEXT],
  ['--primary-foreground', '--primary', TEXT],
  ['--secondary-foreground', '--secondary', TEXT],
  ['--muted-foreground', '--muted', TEXT],
  ['--muted-foreground', '--background', TEXT],
  ['--muted-foreground', '--card', TEXT],
  ['--accent-foreground', '--accent', TEXT],
  ['--destructive-foreground', '--destructive', TEXT],
  ['--destructive', '--background', TEXT],
  ['--success-foreground', '--success', TEXT],
  ['--warning-foreground', '--warning', TEXT],
  ['--info-foreground', '--info', TEXT],
  ['--primary-border', '--background', NON_TEXT],
  ['--primary', '--background', NON_TEXT, 'dark'],
  ['--brand-foreground', '--brand', TEXT],
  ['--foreground', '--camo', TEXT],
  ['--foreground', '--muted', TEXT],
  ['--ring', '--background', NON_TEXT],
  ['--ring', '--card', NON_TEXT],
  ['--input', '--background', NON_TEXT],
];

describe.each<Theme>(['light', 'dark'])('%s theme token contrast', (theme) => {
  const tokens = resolveTokens(css, theme);

  it.each(pairs.filter((pair) => !pair[3] || pair[3] === theme))(
    '%s on %s ≥ %s:1',
    (foreground, background, minimum) => {
      const fg = parse(tokens.get(foreground) ?? '');
      const bg = parse(tokens.get(background) ?? '');
      expect(fg, `${foreground} must be a valid colour`).toBeDefined();
      expect(bg, `${background} must be a valid colour`).toBeDefined();
      if (!fg || !bg) return;
      expect(fg.alpha ?? 1, `${foreground} must be opaque to be checked`).toBe(1);
      expect(bg.alpha ?? 1, `${background} must be opaque to be checked`).toBe(1);
      expect(wcagContrast(fg, bg)).toBeGreaterThanOrEqual(minimum);
    },
  );
});

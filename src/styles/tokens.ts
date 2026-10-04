/**
 * Reads the design tokens out of globals.css so tests can check them.
 * Only used by tests and scripts, never by the app.
 */

export type Theme = 'light' | 'dark';
type Declarations = Map<string, string>;

function declarationsOf(css: string, selector: string): Declarations {
  const out: Declarations = new Map();
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockRe = new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g');
  for (const block of css.matchAll(blockRe)) {
    const body = (block[2] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const decl of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      if (decl[1] && decl[2]) out.set(decl[1], decl[2].trim());
    }
  }
  return out;
}

/**
 * Token lookup for one theme, following var() chains. Resolution is lazy because some tokens
 * (fonts) reference variables injected at runtime by next/font.
 */
export function resolveTokens(
  css: string,
  theme: Theme,
): { get(name: string): string | undefined } {
  const root = declarationsOf(css, ':root');
  const scope = theme === 'dark' ? new Map([...root, ...declarationsOf(css, '.dark')]) : root;

  const resolve = (value: string, depth = 0): string => {
    if (depth > 20) throw new Error(`Token cycle while resolving "${value}"`);
    return value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      const next = scope.get(name);
      if (next === undefined) throw new Error(`Undefined token ${name}`);
      return resolve(next, depth + 1);
    });
  };

  return {
    get(name) {
      const value = scope.get(name);
      return value === undefined ? undefined : resolve(value);
    },
  };
}

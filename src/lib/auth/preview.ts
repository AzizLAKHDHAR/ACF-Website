/**
 * Development-only escape hatch so the hidden shells can be reviewed and screenshotted without a
 * database (`ACF_PREVIEW_HIDDEN_AREAS=1 npm run dev`, used by `npm run screenshots`).
 * `process.env.NODE_ENV` is inlined at build time, so production bundles never take this path.
 */
export function isShellPreview(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.ACF_PREVIEW_HIDDEN_AREAS === '1';
}

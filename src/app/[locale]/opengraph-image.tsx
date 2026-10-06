import { ImageResponse } from 'next/og';
import { routing } from '@/i18n/routing';

// Default social preview for every public page without its own image (detail pages with a cover
// use the cover). Satori can't read CSS variables, so the charter colours are repeated here from
// globals.css (--acf-green, --acf-ink, --acf-white). The brand name is Latin in every locale, which
// also avoids shipping an Arabic font to the image renderer.
const colors = { green: '#72c71e', ink: '#181414', white: '#ffffff' };
const wordmark = 'ACF';
const name = 'Amplify Creative Foundation';
const domain = 'Tunisie · Tunisia';

export const alt = name;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: colors.ink,
        color: colors.white,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignSelf: 'flex-start',
          padding: '8px 32px',
          borderRadius: 24,
          background: colors.green,
          color: colors.ink,
          fontSize: 140,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        {wordmark}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 64, fontWeight: 800 }}>{name}</div>
        <div style={{ fontSize: 32, color: colors.green }}>{domain}</div>
      </div>
    </div>,
    size,
  );
}

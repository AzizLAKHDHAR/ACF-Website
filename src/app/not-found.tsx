import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { getDirection } from '@/i18n/locale';
import { routing } from '@/i18n/routing';
import './globals.css';

const catalogs = { ar, fr, en };

// Only reached for URLs the proxy doesn't localize (e.g. a missing file with an extension).
// Every other unknown path is redirected to a locale and gets app/[locale]/not-found.tsx.
// There is no locale here, so the page offers all three.
export default function GlobalNotFound() {
  return (
    <html lang={routing.defaultLocale} dir={getDirection(routing.defaultLocale)}>
      <body>
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
          <p className="text-sm font-semibold tracking-widest text-muted-foreground">404</p>
          <ul className="flex flex-col gap-4">
            {routing.locales.map((locale) => (
              <li
                key={locale}
                lang={locale}
                dir={getDirection(locale)}
                className="flex flex-col gap-1"
              >
                <span className="text-xl font-semibold">{catalogs[locale].notFound.title}</span>
                <a
                  href={`/${locale}`}
                  className="text-muted-foreground underline underline-offset-4"
                >
                  {catalogs[locale].notFound.backHome}
                </a>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}

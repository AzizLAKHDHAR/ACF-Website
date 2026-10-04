import { notFound } from 'next/navigation';

// Unknown paths inside a locale render the localized app/[locale]/not-found.tsx.
export default function CatchAll() {
  notFound();
}

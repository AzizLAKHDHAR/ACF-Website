import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware replacements for next/link and next/navigation. Always import these in app code.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

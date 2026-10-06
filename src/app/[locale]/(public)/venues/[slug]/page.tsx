import { profileDetailRoute } from '@/lib/routes/catalogue-route';

const route = profileDetailRoute('venues');

// Rendered on first visit, then served from the cache; republished by tag or after 5 minutes.
export const revalidate = 300;
export function generateStaticParams() {
  return [];
}
export const generateMetadata = route.generateMetadata;
export default route.Page;

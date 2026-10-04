import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('terms', '/legal/terms');

export const generateMetadata = route.generateMetadata;
export default route.Page;

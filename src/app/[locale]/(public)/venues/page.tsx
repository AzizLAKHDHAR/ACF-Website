import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('venues', '/venues');

export const generateMetadata = route.generateMetadata;
export default route.Page;

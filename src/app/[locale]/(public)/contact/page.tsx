import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('contact', '/contact');

export const generateMetadata = route.generateMetadata;
export default route.Page;

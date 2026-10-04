import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('about', '/about');

export const generateMetadata = route.generateMetadata;
export default route.Page;

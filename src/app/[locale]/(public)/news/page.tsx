import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('news', '/news');

export const generateMetadata = route.generateMetadata;
export default route.Page;

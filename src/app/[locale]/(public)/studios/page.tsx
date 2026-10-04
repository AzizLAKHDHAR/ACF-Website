import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('studios', '/studios');

export const generateMetadata = route.generateMetadata;
export default route.Page;

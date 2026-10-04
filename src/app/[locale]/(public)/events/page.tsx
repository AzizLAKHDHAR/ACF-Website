import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('events', '/events');

export const generateMetadata = route.generateMetadata;
export default route.Page;

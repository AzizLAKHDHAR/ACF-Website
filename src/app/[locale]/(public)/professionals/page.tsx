import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('professionals', '/professionals');

export const generateMetadata = route.generateMetadata;
export default route.Page;

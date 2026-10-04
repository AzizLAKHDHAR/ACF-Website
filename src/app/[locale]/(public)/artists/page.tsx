import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('artists', '/artists');

export const generateMetadata = route.generateMetadata;
export default route.Page;

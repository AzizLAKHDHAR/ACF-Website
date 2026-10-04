import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('privacy', '/legal/privacy');

export const generateMetadata = route.generateMetadata;
export default route.Page;

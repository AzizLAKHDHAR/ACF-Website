import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('blogs', '/blogs');

export const generateMetadata = route.generateMetadata;
export default route.Page;

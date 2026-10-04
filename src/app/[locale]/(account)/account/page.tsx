import { placeholderRoute } from '@/lib/routes/placeholder-route';

const route = placeholderRoute('account', '/account', { noindex: true });

export const generateMetadata = route.generateMetadata;
export default route.Page;

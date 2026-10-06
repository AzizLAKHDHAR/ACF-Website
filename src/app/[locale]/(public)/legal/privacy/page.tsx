import { legalRoute } from '@/lib/routes/legal-route';

const route = legalRoute('privacy');

export const generateMetadata = route.generateMetadata;
export default route.Page;

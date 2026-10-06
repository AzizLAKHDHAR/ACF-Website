import { catalogueListRoute } from '@/lib/routes/catalogue-route';

const route = catalogueListRoute('professionals');

export const generateMetadata = route.generateMetadata;
export default route.Page;

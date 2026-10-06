import { catalogueListRoute } from '@/lib/routes/catalogue-route';

const route = catalogueListRoute('studios');

export const generateMetadata = route.generateMetadata;
export default route.Page;

import { catalogueListRoute } from '@/lib/routes/catalogue-route';

const route = catalogueListRoute('venues');

export const generateMetadata = route.generateMetadata;
export default route.Page;

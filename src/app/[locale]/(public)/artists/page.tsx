import { catalogueListRoute } from '@/lib/routes/catalogue-route';

const route = catalogueListRoute('artists');

export const generateMetadata = route.generateMetadata;
export default route.Page;

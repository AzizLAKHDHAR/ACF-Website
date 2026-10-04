import { areaRoute } from '@/lib/routes/area-route';

const route = areaRoute('admin');

export const generateMetadata = route.generateIndexMetadata;
export default route.IndexPage;

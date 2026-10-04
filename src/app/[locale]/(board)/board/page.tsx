import { areaRoute } from '@/lib/routes/area-route';

const route = areaRoute('board');

export const generateMetadata = route.generateIndexMetadata;
export default route.IndexPage;

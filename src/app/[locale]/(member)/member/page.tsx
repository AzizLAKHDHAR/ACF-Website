import { areaRoute } from '@/lib/routes/area-route';

const route = areaRoute('member');

export const generateMetadata = route.generateIndexMetadata;
export default route.IndexPage;

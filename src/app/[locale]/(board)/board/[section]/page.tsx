import { areaSubSections } from '@/config/navigation';
import { areaRoute } from '@/lib/routes/area-route';

const route = areaRoute('board');

export const dynamicParams = false;

export function generateStaticParams() {
  return areaSubSections('board').map((section) => ({ section }));
}

export const generateMetadata = route.generateSectionMetadata;
export default route.SectionPage;

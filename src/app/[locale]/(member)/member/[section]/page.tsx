import { areaSubSections } from '@/config/navigation';
import { areaRoute } from '@/lib/routes/area-route';

const route = areaRoute('member');

export const dynamicParams = false;

export function generateStaticParams() {
  return areaSubSections('member').map((section) => ({ section }));
}

export const generateMetadata = route.generateSectionMetadata;
export default route.SectionPage;

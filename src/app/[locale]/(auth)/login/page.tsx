import { placeholderRoute } from '@/lib/routes/placeholder-route';

// Sign-in and sign-up forms arrive with Supabase Auth in phase 2.
const route = placeholderRoute('login', '/login', { noindex: true });

export const generateMetadata = route.generateMetadata;
export default route.Page;

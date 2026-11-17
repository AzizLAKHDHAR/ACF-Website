// Who a meeting, announcement, poll or document is for (roles.md Guard rail 5). Kept apart from the
// Zod schemas so client components can use it without shipping Zod to the browser.
export const audiences = ['member', 'board'] as const;
export type Audience = (typeof audiences)[number];

import { z } from 'zod';

// Query-string filters for public lists, validated at the boundary (CLAUDE.md → Validate at every
// boundary). Anything malformed is dropped rather than rejected, so a bad link still shows a page.

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(first, schema.optional().catch(undefined));

export const listParamsSchema = z.object({
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1)).default(1),
  q: optional(z.string().trim().min(1).max(100)),
  genre: optional(
    z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .max(60),
  ),
  governorate: optional(z.string().regex(/^TN-\d{2}$/)),
  when: optional(z.enum(['upcoming', 'past'])),
  from: optional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  to: optional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});
export type ListParams = z.infer<typeof listParamsSchema>;

export function parseListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ListParams {
  return listParamsSchema.parse(searchParams);
}

/** The current filters as a query object (for pagination links), without empty values. */
export function toQuery(
  params: ListParams,
  overrides: Partial<ListParams> = {},
): Record<string, string> {
  const merged = { ...params, ...overrides };
  return Object.fromEntries(
    Object.entries(merged)
      .filter(
        ([key, value]) => value !== undefined && value !== '' && !(key === 'page' && value === 1),
      )
      .map(([key, value]) => [key, String(value)]),
  );
}

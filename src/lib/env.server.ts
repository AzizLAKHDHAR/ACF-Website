import 'server-only';
import { z } from 'zod';

// Server-only secrets. Never prefix these with NEXT_PUBLIC_ (CLAUDE.md → Security rules 5 and 10).
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
});

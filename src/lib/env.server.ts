import 'server-only';
import { z } from 'zod';

// Server-only secrets. Never prefix these with NEXT_PUBLIC_ (CLAUDE.md → Security rules 5 and 10).
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  // Shared secret for POST /api/webhooks/content (cache revalidation). Unset ⇒ the endpoint refuses.
  CONTENT_WEBHOOK_SECRET: z.string().min(32).optional(),
  // Contact form: Resend API key, sender, recipient. Unset ⇒ the form says it is unavailable.
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_API_URL: z.url().default('https://api.resend.com'),
  EMAIL_FROM: z.string().min(3).optional(),
  CONTACT_EMAIL_TO: z.email().optional(),
  // Cloudflare Turnstile server-side check. Unset ⇒ no captcha (local development).
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
  CONTENT_WEBHOOK_SECRET: process.env.CONTENT_WEBHOOK_SECRET || undefined,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  RESEND_API_URL: process.env.RESEND_API_URL || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  CONTACT_EMAIL_TO: process.env.CONTACT_EMAIL_TO || undefined,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
});

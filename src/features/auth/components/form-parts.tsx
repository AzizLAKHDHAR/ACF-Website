'use client';

import Script from 'next/script';
import { useLocale, useTranslations } from 'next-intl';
import type * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AuthFormState } from '../actions';
import type { FieldErrorKey } from '../schemas';

/** Success or error summary for an auth form; announced to screen readers. */
export function FormAlert({ state }: { state: AuthFormState }) {
  const t = useTranslations('auth');
  if (!state) return null;
  const ok = state.ok;
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={cn(
        'rounded-xl border-2 px-4 py-3 text-sm',
        ok
          ? 'border-primary-border bg-accent text-accent-foreground'
          : 'border-destructive text-destructive',
      )}
    >
      {ok ? t(`notices.${state.data.notice}`) : t(`errors.${state.error}`)}
    </p>
  );
}

type FieldProps = React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  hint?: string;
  error?: FieldErrorKey;
};

/** Label + input + hint + inline error, wired together for assistive technology. */
export function Field({ name, label, hint, error, id = name, ...props }: FieldProps) {
  const t = useTranslations('auth.fieldErrors');
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-destructive">
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
}) {
  const { pending } = useFormStatus();
  const t = useTranslations('auth');
  return (
    <Button type="submit" size="lg" variant={variant} disabled={pending} aria-disabled={pending}>
      {pending ? t('pending') : children}
    </Button>
  );
}

/** The current locale, posted with every auth form (used for redirects and the account locale). */
export function LocaleInput() {
  return <input type="hidden" name="locale" value={useLocale()} />;
}

/**
 * Cloudflare Turnstile, rendered only when a site key is configured. The implicit widget adds a
 * `cf-turnstile-response` field to the form; Supabase Auth verifies it when captcha is enabled.
 */
export function Turnstile() {
  const t = useTranslations('auth');
  const locale = useLocale();
  // Read directly (inlined at build) so zod and the env schema stay out of the client bundle.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <div className="flex flex-col gap-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-language={locale}
        data-theme="auto"
        aria-label={t('captchaLabel')}
      />
    </div>
  );
}

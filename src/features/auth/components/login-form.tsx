'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Link } from '@/i18n/navigation';
import { sendMagicLink, signInWithPassword } from '../actions';
import { Field, FormAlert, LocaleInput, SubmitButton, Turnstile } from './form-parts';

/** Password sign-in, and below it a passwordless magic link for existing accounts. */
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const [passwordState, passwordAction] = useActionState(signInWithPassword, null);
  const [linkState, linkAction] = useActionState(sendMagicLink, null);
  const fields = passwordState?.ok === false ? passwordState.fields : undefined;
  const linkFields = linkState?.ok === false ? linkState.fields : undefined;

  return (
    <div className="flex flex-col gap-10">
      <form action={passwordAction} className="flex flex-col gap-5" noValidate>
        <LocaleInput />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <FormAlert state={passwordState} />
        <Field
          name="email"
          type="email"
          autoComplete="email"
          required
          label={t('emailLabel')}
          error={fields?.email}
        />
        <Field
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label={t('passwordLabel')}
          error={fields?.password}
        />
        <Turnstile />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SubmitButton>{t('signInButton')}</SubmitButton>
          <Link href="/forgot-password" className="text-sm underline underline-offset-4">
            {t('forgotPasswordLink')}
          </Link>
        </div>
      </form>

      <section aria-labelledby="magic-link-title" className="flex flex-col gap-4 border-t pt-8">
        <h2 id="magic-link-title" className="text-lg font-bold">
          {t('magicLinkTab')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('magicLinkIntro')}</p>
        <form action={linkAction} className="flex flex-col gap-5" noValidate>
          <LocaleInput />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <FormAlert state={linkState} />
          <Field
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            label={t('emailLabel')}
            error={linkFields?.email}
          />
          <div>
            <SubmitButton variant="outline">{t('magicLinkButton')}</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}

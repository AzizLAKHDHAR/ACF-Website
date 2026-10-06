'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Field, LocaleInput, SubmitButton, Turnstile } from '@/features/auth/components/form-parts';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { sendContactMessage } from '../actions';

export function ContactForm() {
  const t = useTranslations('content.contact');
  const tErrors = useTranslations('auth.fieldErrors');
  const [state, action] = useActionState(sendContactMessage, null);
  const fields = state?.ok === false ? state.fields : undefined;

  if (state?.ok) {
    return (
      <p
        role="status"
        className="rounded-xl border-2 border-primary-border bg-accent px-4 py-3 text-accent-foreground"
      >
        {t('sent')}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <LocaleInput />
      {state?.ok === false ? (
        <p
          role="alert"
          className="rounded-xl border-2 border-destructive px-4 py-3 text-sm text-destructive"
        >
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <Field
        name="name"
        autoComplete="name"
        required
        maxLength={120}
        label={t('name')}
        error={fields?.name}
        dir="auto"
      />
      <Field
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        label={t('email')}
        error={fields?.email}
      />
      <Field
        name="subject"
        required
        maxLength={160}
        label={t('subject')}
        error={fields?.subject}
        dir="auto"
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="message">{t('message')}</Label>
        <Textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          rows={8}
          dir="auto"
          aria-invalid={fields?.message ? true : undefined}
          aria-describedby={fields?.message ? 'message-error' : undefined}
        />
        {fields?.message ? (
          <p id="message-error" className="text-sm font-semibold text-destructive">
            {tErrors(fields.message)}
          </p>
        ) : null}
      </div>
      {/* Honeypot: off-screen and out of the tab order; people never see or fill it. */}
      <div aria-hidden className={cn('absolute -start-[10000px] size-px overflow-hidden')}>
        <label htmlFor="website">{t('honeypot')}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Turnstile />
      <p className="text-sm text-muted-foreground">{t('privacy')}</p>
      <div>
        <SubmitButton>{t('send')}</SubmitButton>
      </div>
    </form>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { requestPasswordReset } from '../actions';
import { Field, FormAlert, LocaleInput, SubmitButton, Turnstile } from './form-parts';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [state, action] = useActionState(requestPasswordReset, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <LocaleInput />
      <FormAlert state={state} />
      <Field
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t('emailLabel')}
        error={fields?.email}
      />
      <Turnstile />
      <div>
        <SubmitButton>{t('sendResetButton')}</SubmitButton>
      </div>
    </form>
  );
}

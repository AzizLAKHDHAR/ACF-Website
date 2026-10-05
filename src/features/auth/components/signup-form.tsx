'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { signUp } from '../actions';
import { Field, FormAlert, LocaleInput, SubmitButton, Turnstile } from './form-parts';

export function SignUpForm() {
  const t = useTranslations('auth');
  const [state, action] = useActionState(signUp, null);
  const fields = state?.ok === false ? state.fields : undefined;

  if (state?.ok) return <FormAlert state={state} />;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <LocaleInput />
      <FormAlert state={state} />
      <Field
        name="displayName"
        autoComplete="nickname"
        required
        maxLength={120}
        label={t('displayNameLabel')}
        error={fields?.displayName}
        dir="auto"
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        label={t('passwordLabel')}
        hint={t('passwordHint')}
        error={fields?.password}
      />
      <Turnstile />
      <div>
        <SubmitButton>{t('signUpButton')}</SubmitButton>
      </div>
    </form>
  );
}

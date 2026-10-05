'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Link } from '@/i18n/navigation';
import { updatePassword } from '../actions';
import { Field, FormAlert, LocaleInput, SubmitButton } from './form-parts';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const tPages = useTranslations('pages');
  const [state, action] = useActionState(updatePassword, null);
  const fields = state?.ok === false ? state.fields : undefined;

  if (state?.ok) {
    return (
      <div className="flex flex-col items-start gap-4">
        <FormAlert state={state} />
        <Link href="/account" className="underline underline-offset-4">
          {tPages('account.title')}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <LocaleInput />
      <FormAlert state={state} />
      <Field
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label={t('newPasswordLabel')}
        hint={t('passwordHint')}
        error={fields?.password}
      />
      <Field
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        label={t('confirmPasswordLabel')}
        error={fields?.confirm}
      />
      <div>
        <SubmitButton>{t('savePasswordButton')}</SubmitButton>
      </div>
    </form>
  );
}

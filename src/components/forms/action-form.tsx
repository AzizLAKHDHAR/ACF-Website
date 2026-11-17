'use client';

import type * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, useActionState, useContext, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { FieldErrorKey, FormState } from '@/lib/forms/state';
import { cn } from '@/lib/utils';

type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

const FieldErrorsContext = createContext<Partial<Record<string, FieldErrorKey>>>({});

/** The field error a Server Action returned for `name`, if any. */
export function useFieldError(name: string): FieldErrorKey | undefined {
  return useContext(FieldErrorsContext)[name];
}

/**
 * A form posting to a Server Action that returns a `FormState`. It shows the outcome in a live
 * region, hands field errors to the fields below it, and always posts the current locale. Works
 * without JavaScript too (progressive enhancement of `useActionState`).
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = 'default',
  className,
  resetOnSuccess = false,
  hidden,
  confirmMessage,
  testId,
}: {
  action: FormAction;
  children?: React.ReactNode;
  submitLabel: string;
  submitVariant?: 'default' | 'outline' | 'secondary' | 'destructive';
  className?: string;
  resetOnSuccess?: boolean;
  /** Hidden inputs (ids); the action re-validates them and RLS decides what they may touch. */
  hidden?: Record<string, string>;
  /** Asked before a destructive submit (a native dialog: keyboard and screen-reader friendly). */
  confirmMessage?: string;
  testId?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      data-testid={testId}
      className={cn('flex flex-col gap-5', className)}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FieldErrorsContext.Provider value={state?.ok === false ? (state.fields ?? {}) : {}}>
        {children}
      </FieldErrorsContext.Provider>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function SubmitButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: 'default' | 'outline' | 'secondary' | 'destructive';
}) {
  const { pending } = useFormStatus();
  const t = useTranslations('forms');
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-disabled={pending}>
      {pending ? t('pending') : children}
    </Button>
  );
}

/** The outcome of the last submit, announced politely (status) or assertively (alert). */
export function FormMessage({ state }: { state: FormState }) {
  const t = useTranslations('forms');
  return (
    <div aria-live="polite" className="min-w-0 flex-1 text-sm">
      {state?.ok ? (
        <p role="status" className="font-semibold">
          {t(`notices.${state.notice}`)}
          {state.emailsSent !== undefined ? (
            <span className="block font-normal text-muted-foreground">
              {t('emailsSent', { count: state.emailsSent })}
            </span>
          ) : null}
        </p>
      ) : state?.ok === false ? (
        <div role="alert" className="font-semibold text-destructive">
          <p>{t(`errors.${state.error}`)}</p>
          {state.missing?.length ? (
            <ul className="list-inside list-disc font-normal">
              {state.missing.map((item) => (
                <li key={item}>{t(`missing.${item}` as 'missing.tagline')}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

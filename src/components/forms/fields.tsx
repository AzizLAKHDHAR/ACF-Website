'use client';

import type * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useFieldError } from './action-form';

// Labelled fields for ActionForm. Each one wires its hint and the server's field error to the
// control through aria-describedby, so assistive technology reads them with the field.

export const selectClass =
  'h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive md:text-sm';

function useDescribedBy(id: string, name: string, hint?: string) {
  const error = useFieldError(name);
  const t = useTranslations('forms.fieldErrors');
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return {
    describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined,
    invalid: error ? true : undefined,
    hintNode: hint ? (
      <p id={hintId} className="text-sm text-muted-foreground">
        {hint}
      </p>
    ) : null,
    errorNode: error ? (
      <p id={errorId} className="text-sm font-semibold text-destructive">
        {t(error)}
      </p>
    ) : null,
  };
}

type BaseProps = { name: string; label: string; hint?: string; id?: string };

export function TextField({
  name,
  label,
  hint,
  id = name,
  ...props
}: BaseProps & Omit<React.ComponentProps<typeof Input>, 'name' | 'id'>) {
  const { describedBy, invalid, hintNode, errorNode } = useDescribedBy(id, name, hint);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-invalid={invalid} aria-describedby={describedBy} {...props} />
      {hintNode}
      {errorNode}
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  id = name,
  ...props
}: BaseProps & Omit<React.ComponentProps<typeof Textarea>, 'name' | 'id'>) {
  const { describedBy, invalid, hintNode, errorNode } = useDescribedBy(id, name, hint);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={name}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        {...props}
      />
      {hintNode}
      {errorNode}
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  id = name,
  options,
  placeholder,
  ...props
}: BaseProps &
  Omit<React.ComponentProps<'select'>, 'name' | 'id'> & {
    options: { value: string; label: string }[];
    placeholder?: string;
  }) {
  const { describedBy, invalid, hintNode, errorNode } = useDescribedBy(id, name, hint);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={selectClass}
        {...props}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hintNode}
      {errorNode}
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  id = name,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="size-5 shrink-0 accent-primary"
      />
      <Label htmlFor={id} className="font-medium">
        {label}
      </Label>
    </div>
  );
}

/** A group of checkboxes posted under one name (genres, professions, services). */
export function CheckboxGroup({
  name,
  legend,
  options,
  selected,
  className,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  selected: readonly string[];
  className?: string;
}) {
  const error = useFieldError(name);
  const t = useTranslations('forms.fieldErrors');
  return (
    <fieldset className={cn('flex flex-col gap-3', className)}>
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-3">
              <input
                id={id}
                name={name}
                type="checkbox"
                value={option.value}
                defaultChecked={selected.includes(option.value)}
                className="size-5 shrink-0 accent-primary"
              />
              <Label htmlFor={id} className="font-medium">
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
      {error ? <p className="text-sm font-semibold text-destructive">{t(error)}</p> : null}
    </fieldset>
  );
}

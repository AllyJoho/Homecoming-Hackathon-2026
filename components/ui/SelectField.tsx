// @/components/ui/SelectField.tsx
// The TextField chrome around a <select>. Options come as data rather than as
// children so a caller can't accidentally style them per screen.

import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import {
  DISABLED_INPUT_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_ERROR_OVERRIDE,
  FIELD_HELPER_CLASS,
  LABEL_CLASS,
  SELECT_CHEVRON_CLASS,
  SELECT_CLASS,
} from './styles';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: ReactNode;
  options: SelectOption[];
  /** Leading blank option — the "nothing picked yet" state. */
  placeholder?: string;
  error?: string | null;
  helper?: ReactNode;
}

export function SelectField({
  label,
  options,
  placeholder,
  error,
  helper,
  required,
  disabled,
  className = '',
  ...rest
}: SelectFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
    <div className="flex flex-col">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && (
          <span className="text-red-600 dark:text-red-400" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>

      {/* `relative` so the chevron can be placed in the gutter SELECT_CLASS's
          pr-9 reserves. This stays a real <select> — only the painted arrow is
          ours, so native keyboard, mobile picker and screen-reader behaviour
          are all untouched. */}
      <div className="relative">
        <select
          id={id}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${SELECT_CLASS}${error ? FIELD_ERROR_OVERRIDE : ''}${disabled ? DISABLED_INPUT_CLASS : ''} ${className}`.trim()}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Decorative, and pointer-events-none, so a click anywhere over it
            still opens the select underneath. Dimmed with the control rather
            than staying full-strength over a greyed-out field. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`${SELECT_CHEVRON_CLASS}${disabled ? ' opacity-50' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className={FIELD_HELPER_CLASS}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

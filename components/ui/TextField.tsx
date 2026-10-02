// @/components/ui/TextField.tsx
// Label + input + helper/error, so no screen hand-rolls an <input> again.
//
// The purchasing app's FieldWrapper does far more than this (pencil-edit rows,
// section-level error registration, four layouts) because it drives a schema
// form framework. None of that machinery is here — this is just the chrome, and
// the class strings come from the same tokens in ./styles.

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import {
  DISABLED_INPUT_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_ERROR_OVERRIDE,
  FIELD_HELPER_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
} from './styles';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode;
  /** Shown under the field in red, and wires up aria-invalid / aria-describedby. */
  error?: string | null;
  /** Shown under the field in grey when there is no error. */
  helper?: ReactNode;
}

export function TextField({
  label,
  error,
  helper,
  required,
  disabled,
  className = '',
  ...rest
}: TextFieldProps) {
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

      <input
        id={id}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${INPUT_CLASS}${error ? FIELD_ERROR_OVERRIDE : ''}${disabled ? DISABLED_INPUT_CLASS : ''} ${className}`.trim()}
        {...rest}
      />

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

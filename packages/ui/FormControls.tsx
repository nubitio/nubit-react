import { forwardRef } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import './FormControls.scss';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export interface FormFieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  label?: ReactNode;
  error?: ReactNode;
  helpText?: ReactNode;
  children: ReactNode;
}

export const FormField = ({ label, error, helpText, children, className, ...props }: FormFieldProps) => (
  <label {...props} className={cx('nb-form-field', !!error && 'nb-form-field--error', className)}>
    {label && <span className="nb-form-field__label">{label}</span>}
    {children}
    {error ? <span className="nb-form-field__error" role="alert">{error}</span> : helpText ? <span className="nb-form-field__help">{helpText}</span> : null}
  </label>
);

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { className, invalid, ...props },
  ref,
) {
  return <input {...props} ref={ref} className={cx('nb-input', invalid && 'nb-input--invalid', className)} />;
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select {...props} ref={ref} className={cx('nb-input', 'nb-select', invalid && 'nb-input--invalid', className)}>
      {children}
    </select>
  );
});

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { className, invalid, ...props },
  ref,
) {
  return <textarea {...props} ref={ref} className={cx('nb-input', 'nb-textarea', invalid && 'nb-input--invalid', className)} />;
});

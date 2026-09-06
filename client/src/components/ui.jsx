import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import cn from '../utils/cn.js';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: '',
  lg: 'px-5 py-3 text-base',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-clay-500" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Badge({ children, className, tone = 'bg-sand text-ink-muted' }) {
  return <span className={cn('badge', tone, className)}>{children}</span>;
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}

/** Labelled input that wires its own error text to the field for screen readers. */
export function Field({ label, error, hint, id, required, className, children }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
        {required && <span className="text-clay-600"> *</span>}
      </label>
      {typeof children === 'function' ? children({ id, describedBy, invalid: Boolean(error) }) : children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="help-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* These forward their ref on purpose: react-hook-form's `register()` returns a
   ref that has to reach the real DOM node. A plain function component drops it
   silently, and every field then validates as empty however much the user
   types. */

export const Input = forwardRef(function Input({ invalid, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('field', invalid && 'field-error', className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ invalid, className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('field', invalid && 'field-error', className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ invalid, className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('field', invalid && 'field-error', className)}
      {...props}
    >
      {children}
    </select>
  );
});

export function PageHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

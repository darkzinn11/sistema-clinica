import { ArrowDown2 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "ui-input-control w-full rounded-xl border bg-surface-raised text-base text-text placeholder:text-text-subtle " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

/** Envelope de campo: label + controle + dica/erro, com ids ligados pra leitor de tela. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: IconType;
  /** Texto ou elemento fixo à direita (ex.: "min", "R$"). */
  suffix?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon: Icon, suffix, required, className, wrapperClassName, ...props }, ref) => (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, describedBy) => (
        <div className="relative">
          {Icon && <Icon size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />}
          <input
            ref={ref}
            id={id}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            className={cn(control, "h-9 px-3", Icon && "pl-9", suffix ? "pr-12" : "", error ? "border-danger" : "border-border-strong", className)}
            {...props}
          />
          {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{suffix}</span>}
        </div>
      )}
    </Field>
  ),
);
Input.displayName = "Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, placeholder, required, className, wrapperClassName, children, ...props }, ref) => (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, describedBy) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            className={cn(control, "h-9 appearance-none pl-3 pr-9", error ? "border-danger" : "border-border-strong", className)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            {children}
          </select>
          <ArrowDown2 size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle" />
        </div>
      )}
    </Field>
  ),
);
Select.displayName = "Select";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, className, wrapperClassName, rows = 3, ...props }, ref) => (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(control, "px-3 py-2", error ? "border-danger" : "border-border-strong", className)}
          {...props}
        />
      )}
    </Field>
  ),
);
Textarea.displayName = "Textarea";

export function Checkbox({ label, description, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; description?: string }) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer gap-2.5 text-base text-text has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        description ? "items-start" : "items-center",
        className,
      )}
    >
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 border-border-input bg-surface-raised transition-colors duration-150",
          description && "mt-0.5",
          "group-hover:border-border-strong",
          "peer-checked:border-accent peer-checked:bg-accent peer-checked:group-hover:border-accent-strong peer-checked:group-hover:bg-accent-strong",
          "peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg",
        )}
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 scale-50 text-on-accent opacity-0 transition-all duration-150">
          <path d="M3.5 8.3L6.3 11.1L12.5 4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {(label || description) && (
        <span className="flex min-w-0 flex-1 flex-col">
          {label && <span>{label}</span>}
          {description && <span className="text-sm text-text-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Radio({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-base text-text", className)}>
      <input type="radio" className="h-4 w-4 cursor-pointer accent-[var(--c-accent)]" {...props} />
      {label}
    </label>
  );
}

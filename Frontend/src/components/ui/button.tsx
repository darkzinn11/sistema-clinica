import { Add } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { Link, type LinkProps } from "react-router";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "xs" | "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "ms-gradient-button bg-accent text-on-accent hover:bg-accent-strong shadow-card",
  secondary: "bg-surface text-text hover:bg-accent-muted",
  ghost: "bg-transparent text-text-muted hover:bg-surface hover:text-text",
  danger: "bg-danger-bg text-danger hover:brightness-95",
  subtle: "bg-accent-muted text-accent hover:brightness-95",
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2 text-xs gap-1",
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-3.5 text-base gap-2",
  lg: "h-11 px-5 text-md gap-2",
};

const iconOnlySize: Record<Size, string> = {
  xs: "h-7 w-7",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

const iconPx: Record<Size, number> = { xs: 14, sm: 15, md: 16, lg: 18 };

const base =
  "ui-button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:pointer-events-none disabled:opacity-50";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconType;
  iconRight?: IconType;
  /** Botão só com ícone — exige `aria-label`. */
  iconOnly?: boolean;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  loading?: boolean;
}

function content(size: Size, icon?: IconType, iconRight?: IconType, children?: ReactNode, loading?: boolean) {
  const Icon = icon;
  const IconRight = iconRight;
  return (
    <>
      {loading ? (
        <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon size={Icon === Add ? iconPx[size] + 4 : iconPx[size]} variant={Icon === Add ? "Linear" : undefined} aria-hidden />
      )}
      {children}
      {IconRight && <IconRight size={IconRight === Add ? iconPx[size] + 4 : iconPx[size]} variant={IconRight === Add ? "Linear" : undefined} aria-hidden />}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "secondary", size = "md", icon, iconRight, iconOnly, loading, disabled, className, children, type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variantClasses[variant], iconOnly ? iconOnlySize[size] : sizeClasses[size], className)}
      {...props}
    >
      {content(size, icon, iconRight, children, loading)}
    </button>
  ),
);
Button.displayName = "Button";

export interface ButtonLinkProps extends LinkProps, CommonProps {}

export function ButtonLink({ variant = "secondary", size = "md", icon, iconRight, iconOnly, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(base, variantClasses[variant], iconOnly ? iconOnlySize[size] : sizeClasses[size], className)} {...props}>
      {content(size, icon, iconRight, children as ReactNode)}
    </Link>
  );
}

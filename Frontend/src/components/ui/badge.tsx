import type { Icon as IconType } from "iconsax-reactjs";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** `aux` (lilás) identifica categorias e pessoas, nunca alertas. */
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "aux";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface text-text-muted",
  accent: "bg-accent-muted text-accent",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  aux: "bg-aux-bg text-aux",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-text-subtle",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  aux: "bg-aux",
};

export function Badge({
  tone = "neutral",
  dot,
  icon: Icon,
  size = "sm",
  className,
  children,
}: {
  tone?: Tone;
  /** Ponto colorido antes do texto — cor nunca é o único sinal, o texto fica. */
  dot?: boolean;
  icon?: IconType;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />}
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  );
}

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Add } from "iconsax-reactjs";
import { cn } from "@/lib/cn";

/** Só o verde institucional usa ícone branco. Cores auxiliares usam glifo colorido sobre superfície tonal. */
export type IconCircleTone = "accent" | "success" | "warning" | "danger" | "info" | "neutral";
export type IconCircleSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "hero";

const tones: Record<IconCircleTone, string> = {
  accent: "rounded-full bg-accent text-white",
  success: "rounded-full bg-icon-success-surface text-icon-success-foreground",
  warning: "rounded-full bg-icon-warning-surface text-icon-warning-foreground",
  danger: "rounded-full bg-icon-danger-surface text-icon-danger-foreground",
  info: "rounded-full bg-icon-info-surface text-icon-info-foreground",
  neutral: "rounded-full bg-icon-neutral-surface text-icon-neutral-foreground",
};

const sizes: Record<IconCircleSize, string> = {
  xs: "h-7 w-7",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
  xl: "h-11 w-11",
  "2xl": "h-12 w-12",
  "3xl": "h-13 w-13",
  hero: "h-20 w-20",
};

export function IconCircle({
  children, tone = "accent", size = "lg", className,
}: {
  children: ReactNode;
  tone?: IconCircleTone;
  size?: IconCircleSize;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center", tones[tone], sizes[size], className)}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        // Ícone de adição sempre outline, inclusive em fundos verdes.
        const plus = child.type === Add;
        const element = child as ReactElement<{ variant?: "Bold" | "Linear"; size?: number }>;
        return cloneElement(element, {
          variant: plus ? "Linear" : "Bold",
          ...(plus && typeof element.props.size === "number" ? { size: Math.max(20, element.props.size) } : {}),
        });
      })}
    </span>
  );
}

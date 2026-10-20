import { IconCircle } from "@/components/ui/icon-circle";
import { DirectInbox } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  EMPTY_STATE_ASSETS,
  inferEmptyStateAsset,
  type EmptyStateAsset,
} from "@/lib/empty-state-illustrations";

type EmptyStateProps = {
  /** Mantido para retrocompatibilidade e usado quando illustration=null. */
  icon?: IconType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Por padrão, a arte é escolhida pelo contexto do título. Use null para exibir o ícone antigo. */
  illustration?: EmptyStateAsset | null;
  /** Variante para espaços menores, como cards e drawers. */
  compact?: boolean;
};

export function EmptyState({
  icon: Icon = DirectInbox,
  title,
  description,
  action,
  className,
  illustration,
  compact = false,
}: EmptyStateProps) {
  const illustrationSrc = illustration === null
    ? null
    : EMPTY_STATE_ASSETS[illustration ?? inferEmptyStateAsset(title, description)];

  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", compact && "py-6", className)}>
      {illustrationSrc ? (
        <img
          src={illustrationSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="lazy"
          decoding="async"
          className={cn(
            "pointer-events-none max-w-full shrink-0 object-contain",
            compact ? "h-40 w-40 sm:h-44 sm:w-44" : "h-52 w-52 sm:h-60 sm:w-60",
          )}
        />
      ) : (
        <IconCircle tone="neutral" size="xl">
          <Icon size={20} aria-hidden />
        </IconCircle>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-base font-medium text-text">{title}</p>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

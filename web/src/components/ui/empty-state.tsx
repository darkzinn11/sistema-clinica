import { IconCircle } from "@/components/ui/icon-circle";
import { DirectInbox } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon = DirectInbox,
  title,
  description,
  action,
  className,
}: {
  icon?: IconType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <IconCircle tone="neutral" size="xl">
        <Icon size={20} aria-hidden />
      </IconCircle>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-base font-medium text-text">{title}</p>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

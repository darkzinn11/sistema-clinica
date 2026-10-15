import type { ReactNode } from "react";

export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="text-base text-text-muted">{title}</p>
      {action}
    </div>
  );
}

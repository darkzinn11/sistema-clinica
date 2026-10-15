"use client";

import { useTransition } from "react";
import { removeFromWaitlistAction } from "@/lib/actions";

export function RemoveFromWaitlist({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      className="text-xs text-danger underline disabled:opacity-50"
      disabled={isPending}
      onClick={() => startTransition(() => removeFromWaitlistAction(entryId))}
    >
      remover
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { checkInAction, checkOutAction } from "@/lib/actions";

export function CheckinRowActions({
  appointmentId,
  checkedInAt,
  checkedOutAt,
}: {
  appointmentId: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (checkedOutAt) {
    return <span className="text-xs text-text-muted">Atendimento finalizado</span>;
  }

  if (checkedInAt) {
    return (
      <Button
        size="sm"
        variant="secondary"
        loading={isPending}
        onClick={() => startTransition(async () => {
          try {
            await checkOutAction(appointmentId);
          } catch {
            setError("Não foi possível finalizar.");
          }
        })}
      >
        CHECK-OUT
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        loading={isPending}
        onClick={() => startTransition(async () => {
          try {
            await checkInAction(appointmentId);
          } catch {
            setError("Não foi possível dar check-in.");
          }
        })}
      >
        CHECKIN
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmAppointmentAction } from "@/lib/actions";

export function ConfirmButton({ appointmentId }: { appointmentId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      loading={isPending}
      onClick={() => startTransition(() => confirmAppointmentAction(appointmentId))}
    >
      Marcar como confirmado
    </Button>
  );
}

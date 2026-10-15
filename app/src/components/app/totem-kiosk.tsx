"use client";

import { useState } from "react";
import { issueTicketAction } from "@/lib/actions";
import { readableTextColor } from "@/lib/contrast-text";
import type { TicketType } from "@/lib/types";

export function TotemKiosk({ ticketTypes }: { ticketTypes: TicketType[] }) {
  const [issued, setIssued] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  async function onTap(ticketTypeId: string) {
    setIssuing(true);
    const result = await issueTicketAction(ticketTypeId);
    setIssuing(false);
    if (result.ok) {
      setIssued(result.code);
      setTimeout(() => setIssued(null), 6000);
    }
  }

  if (issued) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
        <p className="text-base font-medium uppercase tracking-wide text-text-muted">Sua senha é</p>
        <p className="text-[6rem] font-bold leading-none text-accent">{issued}</p>
        <p className="text-lg text-text-muted">Aguarde ser chamado no painel.</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 sm:grid-cols-2">
      {ticketTypes.map((t) => {
        const color = readableTextColor(t.colorHex);
        return (
          <button
            key={t.id}
            disabled={issuing}
            onClick={() => onTap(t.id)}
            className="flex min-h-[200px] flex-1 items-center justify-center text-3xl font-bold uppercase tracking-wide transition-transform active:scale-[0.98] disabled:opacity-70"
            style={{ backgroundColor: t.colorHex, color }}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

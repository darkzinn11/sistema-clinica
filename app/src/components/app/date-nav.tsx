"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { addDaysIso, formatDateLong, todayIso } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" size="sm" onClick={() => go(addDaysIso(date, -1))} aria-label="Dia anterior">
        ←
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-base font-medium capitalize text-text">{formatDateLong(date)}</span>
        {date !== todayIso() && (
          <button onClick={() => go(todayIso())} className="text-xs text-accent underline">
            voltar para hoje
          </button>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={() => go(addDaysIso(date, 1))} aria-label="Próximo dia">
        →
      </Button>
    </div>
  );
}

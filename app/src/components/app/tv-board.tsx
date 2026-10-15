"use client";

import { useEffect, useState } from "react";
import { getCurrentCallAction } from "@/lib/actions";
import { readableTextColor } from "@/lib/contrast-text";
import type { TicketType, TvBoardConfig } from "@/lib/types";

interface CalledItem {
  code: string;
  counterId?: string;
}

interface BoardData {
  current: CalledItem | null;
  lastCalled: CalledItem[];
  counters: { id: string; name: string }[];
  config: TvBoardConfig;
  activeTicketTypes: TicketType[];
  queueCount: number;
}

export function TvBoard({ initial }: { initial: BoardData }) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    const ms = Math.max(2, data.config.intervalSeconds) * 1000;
    const interval = setInterval(async () => {
      setData(await getCurrentCallAction());
    }, ms);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function counterName(id?: string) {
    if (!id) return "";
    return data.counters.find((c) => c.id === id)?.name ?? "";
  }

  const { config } = data;
  const textColor = readableTextColor(config.backgroundColor);

  if (!data.current) {
    return (
      <div
        className="grid min-h-screen grid-cols-2 gap-px"
        style={{ backgroundColor: config.backgroundColor }}
      >
        {data.activeTicketTypes.map((t) => {
          const color = readableTextColor(t.colorHex);
          return (
            <div
              key={t.id}
              className="flex min-h-[200px] items-center justify-center text-2xl font-bold uppercase tracking-wide"
              style={{ backgroundColor: t.colorHex, color }}
            >
              {t.name}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center"
      style={{ backgroundColor: config.backgroundColor, color: textColor }}
    >
      {config.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.logoUrl} alt="Logo da clínica" className="h-16 object-contain" />
      )}
      <div>
        <p className="text-2xl font-medium uppercase tracking-wide opacity-80">Senha atual</p>
        <p className="text-[8rem] font-bold leading-none" style={{ color: config.color1 }}>
          {data.current.code}
        </p>
        {config.showLocationName && (
          <p className="text-3xl font-semibold" style={{ color: config.color2 }}>
            {counterName(data.current.counterId)}
          </p>
        )}
      </div>

      {config.showLastCalled && data.lastCalled.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-4 opacity-80">
          {data.lastCalled.slice(1, 6).map((item, i) => (
            <span key={i} className="text-xl" style={{ color: config.color3 }}>
              {item.code} · {counterName(item.counterId)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

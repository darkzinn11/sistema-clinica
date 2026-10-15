"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveAvailabilityAction } from "@/lib/actions";
import type { AvailabilityBlock } from "@/lib/types";

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

interface EditableBlock {
  key: string;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  maxEncaixesPerDay: number;
}

function toEditable(blocks: AvailabilityBlock[]): Record<number, EditableBlock[]> {
  const byDay: Record<number, EditableBlock[]> = {};
  for (let day = 0; day < 7; day += 1) byDay[day] = [];
  for (const b of blocks) {
    byDay[b.weekday] = [
      ...byDay[b.weekday],
      {
        key: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
        slotDurationMin: b.slotDurationMin,
        maxEncaixesPerDay: b.maxEncaixesPerDay,
      },
    ];
  }
  return byDay;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function AvailabilityEditor({
  professionalId,
  initialBlocks,
}: {
  professionalId: string;
  initialBlocks: AvailabilityBlock[];
}) {
  const [byDay, setByDay] = useState<Record<number, EditableBlock[]>>(() => toEditable(initialBlocks));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const capacity = useMemo(() => {
    let totalMinutes = 0;
    let slots = 0;
    let blockCount = 0;
    let durationSum = 0;
    for (const blocks of Object.values(byDay)) {
      for (const b of blocks) {
        const span = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);
        if (span > 0) {
          totalMinutes += span;
          slots += Math.floor(span / Math.max(1, b.slotDurationMin));
        }
        blockCount += 1;
        durationSum += b.slotDurationMin;
      }
    }
    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      slots,
      avgDurationMin: blockCount ? Math.round(durationSum / blockCount) : 0,
    };
  }, [byDay]);

  function toggleDay(day: number, enabled: boolean) {
    setByDay((prev) => ({
      ...prev,
      [day]: enabled
        ? prev[day].length > 0
          ? prev[day]
          : [{ key: crypto.randomUUID(), startTime: "08:00", endTime: "12:00", slotDurationMin: 30, maxEncaixesPerDay: 0 }]
        : [],
    }));
  }

  function addBlock(day: number) {
    setByDay((prev) => ({
      ...prev,
      [day]: [
        ...prev[day],
        { key: crypto.randomUUID(), startTime: "14:00", endTime: "18:00", slotDurationMin: 30, maxEncaixesPerDay: 0 },
      ],
    }));
  }

  function updateBlock(day: number, key: string, patch: Partial<EditableBlock>) {
    setByDay((prev) => ({
      ...prev,
      [day]: prev[day].map((b) => (b.key === key ? { ...b, ...patch } : b)),
    }));
  }

  function removeBlock(day: number, key: string) {
    setByDay((prev) => ({ ...prev, [day]: prev[day].filter((b) => b.key !== key) }));
  }

  async function onSave() {
    setSaving(true);
    setSaved(false);
    const blocks = Object.entries(byDay).flatMap(([day, dayBlocks]) =>
      dayBlocks.map((b) => ({
        weekday: Number(day),
        startTime: b.startTime,
        endTime: b.endTime,
        slotDurationMin: b.slotDurationMin,
        maxEncaixesPerDay: b.maxEncaixesPerDay,
      })),
    );
    startTransition(async () => {
      await saveAvailabilityAction(professionalId, blocks);
      setSaving(false);
      setSaved(true);
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((label, day) => {
          const blocks = byDay[day];
          const enabled = blocks.length > 0;
          return (
            <div key={day} className="rounded-md border border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-base font-medium text-text">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={enabled}
                    checked={enabled}
                    onChange={(e) => toggleDay(day, e.target.checked)}
                  />
                  {label}
                </label>
                {enabled && (
                  <button type="button" className="text-xs text-accent underline" onClick={() => addBlock(day)}>
                    + adicionar horário
                  </button>
                )}
              </div>
              {enabled && (
                <div className="mt-3 flex flex-col gap-2">
                  {blocks.map((b) => (
                    <div key={b.key} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        aria-label="Início"
                        value={b.startTime}
                        onChange={(e) => updateBlock(day, b.key, { startTime: e.target.value })}
                        className="h-9 rounded-md border border-border-input bg-bg px-2 text-sm text-text"
                      />
                      <span className="text-text-muted">–</span>
                      <input
                        type="time"
                        aria-label="Fim"
                        value={b.endTime}
                        onChange={(e) => updateBlock(day, b.key, { endTime: e.target.value })}
                        className="h-9 rounded-md border border-border-input bg-bg px-2 text-sm text-text"
                      />
                      <label className="flex items-center gap-1 text-xs text-text-muted">
                        slot
                        <input
                          type="number"
                          min={5}
                          step={5}
                          aria-label="Duração do slot em minutos"
                          value={b.slotDurationMin}
                          onChange={(e) => updateBlock(day, b.key, { slotDurationMin: Number(e.target.value) })}
                          className="h-9 w-16 rounded-md border border-border-input bg-bg px-2 text-sm text-text"
                        />
                        min
                      </label>
                      <label className="flex items-center gap-1 text-xs text-text-muted">
                        máx. encaixes/dia
                        <input
                          type="number"
                          min={0}
                          aria-label="Máximo de encaixes por dia"
                          value={b.maxEncaixesPerDay}
                          onChange={(e) => updateBlock(day, b.key, { maxEncaixesPerDay: Number(e.target.value) })}
                          className="h-9 w-14 rounded-md border border-border-input bg-bg px-2 text-sm text-text"
                        />
                      </label>
                      <button
                        type="button"
                        className="text-xs text-danger underline"
                        onClick={() => removeBlock(day, b.key)}
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3">
          <Button onClick={onSave} loading={saving}>
            Salvar
          </Button>
          {saved && <span className="text-sm text-success">Grade salva.</span>}
        </div>
      </div>

      <div className="h-fit rounded-md border border-border bg-surface-raised p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Capacidade semanal</h3>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Horas totais</dt>
            <dd className="font-medium text-text">{capacity.totalHours}h</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Consultas (slots)</dt>
            <dd className="font-medium text-text">{capacity.slots}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Duração média</dt>
            <dd className="font-medium text-text">{capacity.avgDurationMin} min</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

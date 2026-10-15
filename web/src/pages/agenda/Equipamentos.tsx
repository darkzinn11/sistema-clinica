import { Warning2 } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Meter, Tooltip } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { EQUIP_CAPACITY, equipmentAllocations, equipmentConflicts, toMin } from "@/lib/mock/agenda";
import { TODAY, equipment, professionalById } from "@/lib/mock/core";

const DAY_START = 7;
const DAY_END = 19;
const TOTAL_MIN = (DAY_END - DAY_START) * 60;

export default function Page() {
  const allocs = equipmentAllocations(TODAY);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Equipamentos alocados"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Equipamentos" }]}
        description="Linha do tempo de uso de cada equipamento hoje, com conflitos de agenda em destaque."
      />

      <div className="flex flex-col gap-4">
        {equipment.map((eq) => {
          const eqAllocs = allocs.filter((a) => a.equipmentId === eq.id);
          const capacity = EQUIP_CAPACITY[eq.id] ?? 1;
          const conflicts = equipmentConflicts(eqAllocs, capacity);
          const busyMin = eqAllocs.reduce((s, a) => s + (toMin(a.end) - toMin(a.start)), 0);
          const utilization = Math.min(100, Math.round((busyMin / (TOTAL_MIN * capacity)) * 100));

          return (
            <Card key={eq.id}>
              <CardHeader
                title={eq.name}
                description={`${eqAllocs.length} alocações hoje · capacidade ${capacity}×`}
                actions={<div className="w-40"><Meter value={utilization} label="Utilização" showValue={`${utilization}%`} tone={utilization > 80 ? "danger" : utilization > 50 ? "warning" : "success"} /></div>}
              />
              <CardBody>
                {eqAllocs.length === 0 ? (
                  <p className="text-sm text-text-muted">Sem uso programado hoje.</p>
                ) : (
                  <div className="relative" style={{ height: 56 }}>
                    <div className="absolute inset-x-0 top-0 flex justify-between text-[11px] text-text-subtle">
                      {Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)
                        .filter((h) => h % 2 === 0)
                        .map((h) => (
                          <span key={h}>{h}h</span>
                        ))}
                    </div>
                    <div className="absolute inset-x-0 top-5 h-8 rounded-md bg-surface">
                      {eqAllocs.map((a) => {
                        const left = ((toMin(a.start) - DAY_START * 60) / TOTAL_MIN) * 100;
                        const width = ((toMin(a.end) - toMin(a.start)) / TOTAL_MIN) * 100;
                        const conflict = conflicts.has(a.id);
                        const prof = professionalById(a.professionalId);
                        return (
                          <Tooltip key={a.id} content={`${a.label} · ${a.start}–${a.end} · ${prof?.name ?? ""}`}>
                            <div
                              className={`absolute top-0 flex h-8 items-center gap-1 overflow-hidden rounded-md border px-1.5 text-[11px] font-medium ${conflict ? "border-danger bg-danger-bg text-danger" : "border-border-strong bg-accent-muted text-accent"}`}
                              style={{ left: `${left}%`, width: `${Math.max(width, 2.5)}%` }}
                            >
                              {conflict && <Warning2 size={12} variant="Bold" aria-hidden />}
                              <span className="truncate">{a.label}</span>
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}
                {conflicts.size > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-danger">
                    <Warning2 size={15} variant="Bold" aria-hidden />
                    {conflicts.size} alocações em conflito de horário — capacidade excedida.
                  </p>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

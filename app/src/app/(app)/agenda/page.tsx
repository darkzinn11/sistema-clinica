import Link from "next/link";
import * as store from "@/lib/data/store";
import { todayIso } from "@/lib/format";
import { formatTime } from "@/lib/format";
import { ProfessionalSelect } from "@/components/app/professional-select";
import { DateNav } from "@/components/app/date-nav";
import { AppointmentPanel } from "@/components/app/appointment-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ professionalId?: string; date?: string }>;
}) {
  const params = await searchParams;
  const professionals = await store.getProfessionals();
  const professionalId = params.professionalId ?? professionals[0]?.id ?? "";
  const dateIso = params.date ?? todayIso();

  const [professional, schedule, waitlist, locations, procedures, equipment, insurances] = await Promise.all([
    professionalId ? store.getProfessional(professionalId) : null,
    professionalId ? store.getDaySchedule(professionalId, dateIso) : [],
    professionalId ? store.listWaitlist(professionalId) : [],
    store.getLocations(),
    store.getProcedures(),
    store.getEquipment(),
    store.getInsurances(),
  ]);

  const patientIds = [...schedule.map((a) => a.patientId), ...waitlist.map((w) => w.patientId)];
  const patientsById = await store.getPatientsByIds(patientIds);
  const proceduresById = new Map(procedures.map((p) => [p.id, p]));

  const groups = new Map<string, typeof schedule>();
  for (const appt of schedule) {
    const locationId = appt.procedures[0]?.locationId ?? "sem-local";
    groups.set(locationId, [...(groups.get(locationId) ?? []), appt]);
  }

  function locationName(locationId: string) {
    if (locationId === "sem-local") return "Sem sala definida";
    return locations.find((l) => l.id === locationId)?.name ?? locationId;
  }

  function patientName(patientId: string) {
    return patientsById.get(patientId)?.fullName ?? "Paciente";
  }

  function procedureNames(procIds: string[]) {
    return procIds.map((id) => proceduresById.get(id)?.name ?? id).join(", ");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <ProfessionalSelect professionals={professionals} value={professionalId} />
          <DateNav date={dateIso} />
        </div>
        <div className="flex items-center gap-3">
          {professional && (
            <Link href={`/disponibilidade/${professional.id}`} className="text-sm text-accent underline">
              Configurar disponibilidade
            </Link>
          )}
          {professionalId && (
            <AppointmentPanel
              professionalId={professionalId}
              dateIso={dateIso}
              procedures={procedures}
              locations={locations}
              equipment={equipment}
              insurances={insurances}
            />
          )}
        </div>
      </div>

      {!professional && (
        <EmptyState title="Nenhum profissional cadastrado ainda." />
      )}

      {professional && schedule.length === 0 && (
        <EmptyState title={`${professional.fullName} não tem agendamentos neste dia.`} />
      )}

      <div className="flex flex-col gap-6">
        {[...groups.entries()].map(([locationId, items]) => (
          <div key={locationId} className="flex flex-col gap-2">
            <h3 className="rounded-md bg-accent-muted px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-accent">
              {locationName(locationId)}
            </h3>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised">
              {items.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="w-14 text-sm font-medium text-text-muted">{formatTime(appt.startsAt)}</span>
                    <div>
                      <p className="text-base text-text">
                        {patientName(appt.patientId)}
                        {appt.isEncaixe && (
                          <span className="ml-2 rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
                            encaixe
                          </span>
                        )}
                        {appt.isRetorno && (
                          <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">
                            retorno
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-text-muted">
                        {procedureNames(appt.procedures.map((p) => p.procedureId))}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Card className="max-w-sm">
        <h3 className="text-base font-semibold text-text">Fila de espera</h3>
        {waitlist.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            Nenhum paciente na fila de espera deste profissional.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {waitlist.map((entry) => (
              <li key={entry.id} className="text-sm text-text">
                {patientName(entry.patientId)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import * as store from "@/lib/data/store";
import { EmptyState } from "@/components/ui/empty-state";
import { AddToWaitlist } from "@/components/app/add-to-waitlist";
import { RemoveFromWaitlist } from "@/components/app/remove-from-waitlist";

export default async function EsperaPage() {
  const [entries, professionals] = await Promise.all([store.listWaitlist(), store.getProfessionals()]);
  const [patientsById, professionalsById] = await Promise.all([
    store.getPatientsByIds(entries.map((e) => e.patientId)),
    store.getProfessionalsById(),
  ]);

  function patientName(id: string) {
    return patientsById.get(id)?.fullName ?? "Paciente";
  }
  function professionalName(id?: string) {
    if (!id) return "Qualquer profissional";
    return professionalsById.get(id)?.fullName ?? "—";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Sala de espera</h1>
        <AddToWaitlist professionals={professionals} />
      </div>

      {entries.length === 0 ? (
        <EmptyState title="Nenhum paciente aguardando para ser atendido." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-base text-text">{patientName(entry.patientId)}</p>
                <p className="text-sm text-text-muted">{professionalName(entry.professionalId)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-subtle">
                  chegou às{" "}
                  {new Date(entry.arrivedAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Fortaleza",
                  })}
                </span>
                <RemoveFromWaitlist entryId={entry.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

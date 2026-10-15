import * as store from "@/lib/data/store";
import { todayIso, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckinRowActions } from "@/components/app/checkin-row-actions";
import { DateNav } from "@/components/app/date-nav";
import { ProfessionalFilter } from "@/components/app/professional-filter";

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; professionalId?: string }>;
}) {
  const params = await searchParams;
  const dateIso = params.date ?? todayIso();
  const [professionals, allItems] = await Promise.all([
    store.getProfessionals(),
    store.listCheckinBoard(dateIso),
  ]);
  const items = params.professionalId
    ? allItems.filter((a) => a.professionalId === params.professionalId)
    : allItems;

  const [professionalsById, patientsById] = await Promise.all([
    store.getProfessionalsById(),
    store.getPatientsByIds(items.map((a) => a.patientId)),
  ]);

  function professionalName(id: string) {
    return professionalsById.get(id)?.fullName ?? "—";
  }
  function patientName(id: string) {
    return patientsById.get(id)?.fullName ?? "Paciente";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-text">Check-in</h1>
        <div className="flex items-center gap-3">
          <ProfessionalFilter professionals={professionals} value={params.professionalId} />
          <DateNav date={dateIso} />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nenhum agendamento neste dia." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface-raised">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Agendado</th>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Profissional</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((appt) => (
                <tr key={appt.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-muted">{formatTime(appt.startsAt)}</td>
                  <td className="px-4 py-3 text-text">{patientName(appt.patientId)}</td>
                  <td className="px-4 py-3 text-text-muted">{professionalName(appt.professionalId)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={appt.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CheckinRowActions
                      appointmentId={appt.id}
                      checkedInAt={appt.checkedInAt}
                      checkedOutAt={appt.checkedOutAt}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

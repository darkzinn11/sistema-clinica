import * as store from "@/lib/data/store";
import { addDaysIso, formatTime, todayIso } from "@/lib/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfessionalFilter } from "@/components/app/professional-filter";
import { ConfirmButton } from "@/components/app/confirm-button";

export default async function ConfirmacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ professionalId?: string }>;
}) {
  const params = await searchParams;
  const fromDateIso = todayIso();
  const toDateIso = addDaysIso(fromDateIso, 7);

  const [professionals, { pending, confirmedCount, percentConfirmed }] = await Promise.all([
    store.getProfessionals(),
    store.listConfirmationQueue({ fromDateIso, toDateIso, professionalId: params.professionalId }),
  ]);

  const [professionalsById, patientsById] = await Promise.all([
    store.getProfessionalsById(),
    store.getPatientsByIds(pending.map((a) => a.patientId)),
  ]);

  const byProfessional = new Map<string, typeof pending>();
  for (const appt of pending) {
    byProfessional.set(appt.professionalId, [...(byProfessional.get(appt.professionalId) ?? []), appt]);
  }

  function patientName(id: string) {
    return patientsById.get(id)?.fullName ?? "Paciente";
  }
  function patientPhone(id: string) {
    return patientsById.get(id)?.mobilePhone ?? "";
  }
  function professionalName(id: string) {
    return professionalsById.get(id)?.fullName ?? "—";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-text">Confirmação de agendamentos</h1>
        <ProfessionalFilter professionals={professionals} value={params.professionalId} />
      </div>

      <div className="max-w-sm">
        <ProgressBar
          value={percentConfirmed}
          label={`${percentConfirmed}% confirmada · ${pending.length} a confirmar / ${confirmedCount} confirmados (próximos 7 dias)`}
        />
      </div>

      {pending.length === 0 ? (
        <EmptyState title="Nada a confirmar nos próximos 7 dias." />
      ) : (
        <div className="flex flex-col gap-6">
          {[...byProfessional.entries()].map(([professionalId, items]) => (
            <div key={professionalId} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                {professionalName(professionalId)}
              </h3>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised">
                {items.map((appt) => (
                  <li key={appt.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-base text-text">{patientName(appt.patientId)}</p>
                      <p className="text-sm text-text-muted">
                        {new Date(appt.startsAt).toLocaleDateString("pt-BR")} às {formatTime(appt.startsAt)} ·{" "}
                        {patientPhone(appt.patientId)}
                      </p>
                    </div>
                    <ConfirmButton appointmentId={appt.id} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-subtle">
        Envio de WhatsApp é simulado nesta rodada — o botão só marca como
        confirmado. A integração de verdade com a WhatsApp Business API entra
        em /replica-backend.
      </p>
    </div>
  );
}

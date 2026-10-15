import { Calendar, CalendarTick, CloseCircle, TickCircle } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, THead, TBody, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/charts";
import { ButtonLink } from "@/components/ui/button";
import type { Patient } from "@/lib/mock/core";
import { TODAY, appointmentsForPatient, procedureById, professionalById } from "@/lib/mock/core";
import { dateBR, pct } from "@/lib/format";

export function Agendamentos({ patient }: { patient: Patient }) {
  const all = appointmentsForPatient(patient.id).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const future = all.filter((a) => a.date >= TODAY).reverse();
  const history = all.filter((a) => a.date < TODAY);

  const attended = history.filter((a) => a.status === "atendido").length;
  const noShow = history.filter((a) => a.status === "nao_compareceu").length;
  const total = history.length;
  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
        <StatCard label="Comparecimento" value={pct(attendanceRate)} icon={<TickCircle size={18} />} />
        <StatCard label="Faltas" value={noShow.toLocaleString("pt-BR")} icon={<CloseCircle size={18} />} />
        <StatCard label="Total de consultas" value={total.toLocaleString("pt-BR")} icon={<CalendarTick size={18} />} />
      </div>

      <Card>
        <CardHeader title="Próximos agendamentos" actions={<ButtonLink to="/agenda?novo=1" size="sm" variant="secondary" icon={Calendar}>Agendar</ButtonLink>} />
        <CardBody>
          {future.length === 0 ? (
            <EmptyState icon={CalendarTick} title="Nenhum agendamento futuro" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Data</TH>
                  <TH>Horário</TH>
                  <TH>Procedimento</TH>
                  <TH>Profissional</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {future.map((a) => (
                  <TR key={a.id}>
                    <TD className="whitespace-nowrap">{dateBR(a.date)}</TD>
                    <TD className="tabular whitespace-nowrap">{a.start}</TD>
                    <TD>{procedureById(a.procedureId)?.name}</TD>
                    <TD>{professionalById(a.professionalId)?.name}</TD>
                    <TD>
                      <StatusBadge status={a.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Histórico" description="Consultas e exames já realizados." />
        <CardBody>
          {history.length === 0 ? (
            <EmptyState icon={Calendar} title="Nenhum histórico ainda" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Data</TH>
                  <TH>Horário</TH>
                  <TH>Procedimento</TH>
                  <TH>Profissional</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {history.map((a) => (
                  <TR key={a.id}>
                    <TD className="whitespace-nowrap">{dateBR(a.date)}</TD>
                    <TD className="tabular whitespace-nowrap">{a.start}</TD>
                    <TD>{procedureById(a.procedureId)?.name}</TD>
                    <TD>{professionalById(a.professionalId)?.name}</TD>
                    <TD>
                      <StatusBadge status={a.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

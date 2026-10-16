import { Danger, PauseCircle, PlayCircle, TickCircle, Timer1 } from "iconsax-reactjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AnexosTab } from "@/components/atendimento/AnexosTab";
import { DocumentosTab } from "@/components/atendimento/DocumentosTab";
import { EvolucaoTab } from "@/components/atendimento/EvolucaoTab";
import { ExamesTab } from "@/components/atendimento/ExamesTab";
import { FinalizarModal } from "@/components/atendimento/FinalizarModal";
import { PatientContext } from "@/components/atendimento/PatientContext";
import { PrescricaoTab } from "@/components/atendimento/PrescricaoTab";
import { EMPTY_EVOLUCAO, type DocumentoGerado, type EvolucaoState, type ExameItem, type PrescricaoItem } from "@/components/atendimento/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { age } from "@/lib/format";
import { TODAY, insuranceName, patientById, procedureById, professionalById, todayAppointments } from "@/lib/mock/core";
import { anexosIniciaisFor } from "@/lib/mock/atendimento";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function Atendimento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const appointment = useMemo(() => todayAppointments.find((a) => a.id === id) ?? todayAppointments.find((a) => a.status === "em_atendimento"), [id]);

  const patient = appointment ? patientById(appointment.patientId) : undefined;
  const professional = appointment ? professionalById(appointment.professionalId) : undefined;
  const procedure = appointment ? procedureById(appointment.procedureId) : undefined;

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [evolucao, setEvolucao] = useState<EvolucaoState>(EMPTY_EVOLUCAO);
  const [prescricao, setPrescricao] = useState<PrescricaoItem[]>([]);
  const [controlada, setControlada] = useState(false);
  const [exames, setExames] = useState<ExameItem[]>([]);
  const [justificativa, setJustificativa] = useState("");
  const [documentos, setDocumentos] = useState<DocumentoGerado[]>([]);
  const [anexos, setAnexos] = useState(() => (patient ? anexosIniciaisFor(patient.id) : []));

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);

  if (!appointment || !patient || !professional || !procedure) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Atendimento" breadcrumbs={[{ label: "Atendimento", href: "/atendimento" }, { label: "Consulta" }]} />
        <EmptyState title="Nenhum atendimento em andamento" description="Volte para a lista de atendimentos e inicie a consulta de um paciente." />
      </div>
    );
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  function handleFinalizarConfirm() {
    setFinalizarOpen(false);
    navigate("/atendimento");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-border bg-bg/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={patient.name} size="lg" />
            <div>
              <p className="font-display text-lg font-semibold text-text">{patient.name}</p>
              <p className="text-sm text-text-muted">
                {age(patient.birthDate, TODAY)} anos · {patient.sex === "F" ? "Feminino" : "Masculino"} · {insuranceName(patient.insuranceId)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium tabular text-text">
              <Timer1 size={16} aria-hidden className={paused ? "text-text-subtle" : "text-accent"} />
              {pad(minutes)}:{pad(seconds)}
            </span>
            <Button variant="secondary" icon={paused ? PlayCircle : PauseCircle} onClick={() => setPaused((p) => !p)}>
              {paused ? "Retomar" : "Pausar"}
            </Button>
            <Button variant="primary" icon={TickCircle} onClick={() => setFinalizarOpen(true)}>
              Finalizar atendimento
            </Button>
          </div>
        </div>

        <div className="mt-3">
          {patient.alerts.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              <Danger size={16} aria-hidden />
              {patient.alerts.join(" · ")}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-text-muted">
              <Danger size={16} aria-hidden className="text-text-subtle" />
              Nenhuma alergia registrada
            </div>
          )}
        </div>

        <p className="mt-3 text-sm text-text-muted">
          {procedure.name} <span className="text-text-subtle">· {professional.name}</span>
          {appointment.isFirstVisit && (
            <Badge tone="info" size="sm" className="ml-2">
              1ª consulta
            </Badge>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <PatientContext patient={patient} />

        <div>
          <Tabs
            tabs={[
              { label: "Evolução" },
              { label: "Prescrição", count: prescricao.length || undefined },
              { label: "Exames", count: exames.length || undefined },
              { label: "Documentos", count: documentos.length || undefined },
              { label: "Anexos", count: anexos.length || undefined },
            ]}
          >
            {(active) => (
              <>
                {active === 0 && <EvolucaoTab value={evolucao} onChange={setEvolucao} patientId={patient.id} />}
                {active === 1 && (
                  <PrescricaoTab
                    items={prescricao}
                    onChange={setPrescricao}
                    controlada={controlada}
                    onControladaChange={setControlada}
                    patientName={patient.name}
                    professionalName={professional.name}
                  />
                )}
                {active === 2 && <ExamesTab items={exames} onChange={setExames} justificativa={justificativa} onJustificativaChange={setJustificativa} />}
                {active === 3 && <DocumentosTab patient={patient} generated={documentos} onGenerate={(d) => setDocumentos((prev) => [...prev, d])} />}
                {active === 4 && <AnexosTab anexos={anexos} onChange={setAnexos} />}
              </>
            )}
          </Tabs>
        </div>
      </div>

      <FinalizarModal
        open={finalizarOpen}
        onClose={() => setFinalizarOpen(false)}
        onConfirm={handleFinalizarConfirm}
        summary={{
          evolucaoPreenchida: evolucao.queixaPrincipal.trim().length > 0,
          prescricaoCount: prescricao.length,
          examesCount: exames.length,
          documentosCount: documentos.length,
        }}
      />
    </div>
  );
}

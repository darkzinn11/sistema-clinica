import { SearchNormal1, UserAdd } from "iconsax-reactjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { brl } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import {
  useAvailability, useCreateAppointment, useEnabledProcedures, usePatientSearch, useQuickPatient, type CreateAppointmentInput,
} from "@/lib/api/agenda";
import { useCatalog } from "@/lib/agenda/provider";
import { clock } from "@/lib/agenda/time";

interface ChosenPatient { id: string; name: string; phone: string | null }

const CHANNELS: { value: NonNullable<CreateAppointmentInput["canal"]>; label: string }[] = [
  { value: "clinica", label: "Na clínica" },
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "online", label: "Online" },
];

const message = (error: unknown) => (error instanceof ApiError ? error.message : "Não foi possível concluir. Tente de novo.");

/** Atrasa o valor para a busca não disparar a cada letra digitada. */
function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Novo agendamento de verdade: busca o paciente no cadastro, mostra só os procedimentos que o profissional realiza e só os horários
 * que o backend diz estarem livres (grade, bloqueios e agendamentos já considerados). Aberto pelo botão ou por ?novo=1.
 */
export function NovoAgendamentoDrawer({
  open, onClose, defaultDate, defaultProfessionalId, defaultTime, defaultPatient,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  defaultProfessionalId?: string;
  defaultTime?: string;
  /** Vindo da ficha do paciente ("Agendar"): o paciente já vem escolhido. */
  defaultPatient?: { id: string; name: string };
}) {
  const { professionals, procedureById, unitId } = useCatalog();
  const create = useCreateAppointment();
  const quickPatient = useQuickPatient();
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState<ChosenPatient | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCpf, setNewCpf] = useState("");
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId ?? professionals[0]?.id ?? "");
  const [procedureId, setProcedureId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [slot, setSlot] = useState("");
  const [wantedTime, setWantedTime] = useState<string | undefined>(defaultTime);
  const [channel, setChannel] = useState<NonNullable<CreateAppointmentInput["canal"]>>("clinica");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const search = usePatientSearch(useDebounced(patient ? "" : query));
  const enabled = useEnabledProcedures(professionalId || undefined);
  const procedureOptions = (enabled.data ?? []).filter((p) => p.ativo);
  const slots = useAvailability(professionalId || undefined, procedureId || undefined, date || undefined);
  const procedure = procedureById(procedureId);

  useEffect(() => {
    if (!open) return;
    setQuery(defaultPatient?.name ?? "");
    setPatient(defaultPatient ? { id: defaultPatient.id, name: defaultPatient.name, phone: null } : null);
    setShowNew(false);
    setNewName("");
    setNewPhone("");
    setNewCpf("");
    setProfessionalId(defaultProfessionalId ?? professionals[0]?.id ?? "");
    setProcedureId("");
    setDate(defaultDate);
    setSlot("");
    setWantedTime(defaultTime);
    setChannel("clinica");
    setNotes("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Procedimento padrão: o primeiro que o profissional realiza.
  useEffect(() => {
    if (!procedureOptions.length) {
      if (procedureId) setProcedureId("");
      return;
    }
    if (!procedureOptions.some((p) => p.id === procedureId)) setProcedureId(procedureOptions[0].id);
  }, [procedureOptions, procedureId]);

  // Clicou num horário vazio da grade: já deixa aquele horário escolhido quando ele estiver livre.
  useEffect(() => {
    if (!wantedTime || !slots.data) return;
    const match = slots.data.find((s) => clock(s.inicio) === wantedTime);
    if (match) setSlot(match.inicio);
    setWantedTime(undefined);
  }, [wantedTime, slots.data]);

  const canSave = Boolean(patient && professionalId && procedureId && slot);

  function saveNewPatient() {
    setError(null);
    quickPatient.mutateAsync({ nome: newName.trim(), celular: newPhone.trim(), cpf: newCpf.replace(/\D/g, "") || undefined })
      .then((created) => {
        setPatient({ id: created.id, name: created.nome, phone: created.celular });
        setShowNew(false);
      })
      .catch((e) => setError(message(e)));
  }

  function handleSave() {
    if (!patient || !slot) return;
    setError(null);
    create.mutateAsync({
      unidadeId: unitId, profissionalId: professionalId, pacienteId: patient.id, procedimentoId: procedureId,
      inicio: slot, observacao: notes.trim() || undefined, canal: channel,
    }).then(onClose).catch((e) => setError(message(e)));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo agendamento"
      description="Escolha o paciente, o profissional, o procedimento e um horário livre."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-sm text-text-muted">
            {procedure?.priceCents != null && <>Valor: <span className="tabular font-semibold text-text">{brl(procedure.priceCents)}</span></>}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" disabled={!canSave} loading={create.isPending} onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="relative">
          <Input
            label="Paciente"
            required
            icon={SearchNormal1}
            placeholder="Buscar por nome, CPF, telefone ou prontuário…"
            value={patient ? patient.name : query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPatient(null);
            }}
          />
          {!patient && (search.data ?? []).length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-surface-raised p-1 shadow-pop">
              {(search.data ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPatient({ id: p.id, name: p.nome, phone: p.celular });
                    setQuery(p.nome);
                  }}
                  className="flex w-full flex-col rounded-lg px-3 py-1.5 text-left hover:bg-surface"
                >
                  <span className="text-sm text-text">{p.nome}</span>
                  <span className="text-xs text-text-muted">
                    {[p.celular, p.numeroProntuario ? `Prontuário ${p.numeroProntuario}` : null].filter(Boolean).join(" · ") || "Sem telefone"}
                  </span>
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 2 && !patient && !search.isFetching && (search.data ?? []).length === 0 && !showNew && (
            <p className="mt-1.5 text-sm text-text-muted">Nenhum paciente encontrado.</p>
          )}
          {query.trim().length >= 2 && !patient && !showNew && (
            <button type="button" onClick={() => { setShowNew(true); setNewName(query.trim()); }} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              <UserAdd size={15} aria-hidden />
              Cadastrar "{query.trim()}" como novo paciente
            </button>
          )}
        </div>

        {showNew && (
          <div className="flex flex-col gap-3 rounded-lg bg-surface px-3 py-3">
            <p className="text-sm font-medium text-text">Novo paciente (cadastro rápido)</p>
            <Input label="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <Input label="Celular com DDD" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(98) 99999-9999" required />
            <Input label="CPF (opcional)" value={newCpf} onChange={(e) => setNewCpf(e.target.value)} placeholder="Somente números" />
            <p className="text-xs text-text-muted">Os demais dados do paciente ficam no cadastro completo, em Pacientes.</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
                Voltar
              </Button>
              <Button size="sm" variant="primary" disabled={!newName.trim() || newPhone.replace(/\D/g, "").length < 10} loading={quickPatient.isPending} onClick={saveNewPatient}>
                Cadastrar paciente
              </Button>
            </div>
          </div>
        )}

        <Select
          label="Profissional"
          required
          value={professionalId}
          onChange={(e) => {
            setProfessionalId(e.target.value);
            setProcedureId("");
            setSlot("");
          }}
          options={professionals.map((p) => ({ value: p.id, label: `${p.name} · ${p.specialty}` }))}
        />

        <Select
          label="Procedimento"
          required
          value={procedureId}
          onChange={(e) => {
            setProcedureId(e.target.value);
            setSlot("");
          }}
          disabled={enabled.isFetching || procedureOptions.length === 0}
          options={procedureOptions.length ? procedureOptions.map((p) => ({ value: p.id, label: p.nome })) : [{ value: "", label: enabled.isFetching ? "Carregando…" : "Este profissional não tem procedimentos habilitados" }]}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
          <Input
            type="date"
            label="Data"
            required
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot("");
            }}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Horário</span>
            {!procedureId ? (
              <p className="text-sm text-text-muted">Escolha o procedimento para ver os horários.</p>
            ) : slots.isFetching ? (
              <p className="text-sm text-text-muted">Buscando horários livres…</p>
            ) : slots.isError ? (
              <p className="text-sm text-danger">{message(slots.error)}</p>
            ) : (slots.data ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(slots.data ?? []).map((s) => (
                  <button
                    key={s.inicio}
                    type="button"
                    onClick={() => setSlot(s.inicio)}
                    className={`h-8 rounded-full border px-3 text-sm tabular transition-colors ${s.inicio === slot ? "border-accent bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text hover:bg-accent-muted"}`}
                  >
                    {clock(s.inicio)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Sem horários livres nesta data.</p>
            )}
          </div>
        </div>

        <Select label="Como o paciente pediu" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} options={CHANNELS} />
        <Textarea label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

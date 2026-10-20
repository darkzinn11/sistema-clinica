import { Add, CloseCircle, SearchNormal1, UserAdd } from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal, Switch } from "@/components/ui/overlay";
import { brl } from "@/lib/format";
import { allPatients, findPatient, freeSlots, hm, norm, priceFor, registerPatient, toMin, workWindow } from "@/lib/mock/agenda";
import { newAppointmentId, newPatientId } from "@/components/agenda/store";
import {
  insurances,
  procedureById,
  procedures,
  professionalById,
  professionalLocation,
  professionals,
  type Appointment,
} from "@/lib/mock/core";

interface ProcRow {
  key: number;
  procedureId: string;
  insuranceId: string;
  priceCents: number;
}

/**
 * Modal de criação de agendamento — aberta pelo botão "Novo agendamento" ou
 * automaticamente quando a URL da Agenda do dia tem `?novo=1`.
 */
export function NovoAgendamentoDrawer({
  open,
  onClose,
  defaultDate,
  defaultProfessionalId,
  defaultTime,
  apptsOn,
  add,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  defaultProfessionalId?: string;
  defaultTime?: string;
  apptsOn: (date: string) => Appointment[];
  add: (list: Appointment[]) => void;
}) {
  const rowKey = useRef(0);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId ?? professionals[0].id);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState<string | null>(defaultTime ?? null);
  const [rows, setRows] = useState<ProcRow[]>([]);
  const [isEncaixe, setIsEncaixe] = useState(false);
  const [isRetorno, setIsRetorno] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setPatientQuery("");
    setSelectedPatientId(null);
    setShowNewPatient(false);
    setNewName("");
    setNewPhone("");
    const profId = defaultProfessionalId ?? professionals[0].id;
    setProfessionalId(profId);
    setDate(defaultDate);
    setTime(defaultTime ?? null);
    setIsEncaixe(false);
    setIsRetorno(false);
    setNotes("");
    const prof = professionalById(profId);
    const defaultProc = procedures.find((p) => p.specialty === prof?.specialty) ?? procedures[0];
    rowKey.current = 1;
    setRows([{ key: 0, procedureId: defaultProc.id, insuranceId: "i0", priceCents: defaultProc.priceCents }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const professional = professionalById(professionalId);
  const slots = professional && workWindow(professional, date) ? freeSlots(professional, date, apptsOn(date)) : [];
  const matches = patientQuery && !selectedPatientId ? allPatients().filter((p) => norm(p.name).includes(norm(patientQuery))).slice(0, 6) : [];
  const total = rows.reduce((s, r) => s + r.priceCents, 0);
  const canSave = Boolean(selectedPatientId && professionalId && date && time && rows.length > 0);

  function updateRow(key: number, patch: Partial<ProcRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.procedureId || patch.insuranceId) {
          const proc = procedureById(next.procedureId);
          if (proc) next.priceCents = priceFor(proc, next.insuranceId) ?? 0;
        }
        return next;
      }),
    );
  }

  function addRow() {
    const proc = procedures[0];
    rowKey.current += 1;
    setRows((prev) => [...prev, { key: rowKey.current, procedureId: proc.id, insuranceId: "i0", priceCents: proc.priceCents }]);
  }

  function saveNewPatient() {
    if (!newName.trim()) return;
    const id = newPatientId();
    registerPatient({
      id,
      name: newName.trim(),
      sex: "F",
      birthDate: "1990-01-01",
      cpf: "",
      phone: newPhone.trim(),
      email: "",
      insuranceId: "i0",
      insuranceCard: "",
      leadSource: "Indicação",
      createdAt: defaultDate,
      tags: [],
      alerts: [],
      balanceCents: 0,
      city: "São Luís",
    });
    setSelectedPatientId(id);
    setPatientQuery(newName.trim());
    setShowNewPatient(false);
  }

  function handleSave() {
    if (!professional || !time || !selectedPatientId || rows.length === 0) return;
    const end = hm(toMin(time) + professional.slotMin);
    const first = rows[0];
    const extra = rows.slice(1).map((r) => procedureById(r.procedureId)?.name).filter(Boolean);
    const notesFinal = [extra.length ? `Procedimentos adicionais: ${extra.join(", ")}` : null, notes.trim() || null].filter(Boolean).join("\n");
    const appt: Appointment = {
      id: newAppointmentId(),
      date,
      start: time,
      end,
      professionalId,
      patientId: selectedPatientId,
      procedureId: first.procedureId,
      locationId: professionalLocation[professionalId],
      status: "confirmado",
      insuranceId: first.insuranceId,
      isEncaixe,
      isRetorno,
      isFirstVisit: false,
      priceCents: total,
      notes: notesFinal || undefined,
    };
    add([appt]);
    onClose();
  }

  const selectedPatient = selectedPatientId ? findPatient(selectedPatientId) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo agendamento"
      description="Preencha os dados do paciente, profissional e procedimentos."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-sm text-text-muted">
            Total: <span className="tabular font-semibold text-text">{brl(total)}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" disabled={!canSave} onClick={handleSave}>
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
            placeholder="Buscar por nome…"
            value={selectedPatient ? selectedPatient.name : patientQuery}
            onChange={(e) => {
              setPatientQuery(e.target.value);
              setSelectedPatientId(null);
            }}
          />
          {matches.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-surface-raised p-1 shadow-pop">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setPatientQuery(p.name);
                  }}
                  className="flex w-full flex-col rounded-lg px-3 py-1.5 text-left hover:bg-surface"
                >
                  <span className="text-sm text-text">{p.name}</span>
                  <span className="text-xs text-text-muted">{p.phone}</span>
                </button>
              ))}
            </div>
          )}
          {patientQuery && !selectedPatientId && !showNewPatient && (
            <button type="button" onClick={() => setShowNewPatient(true)} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              <UserAdd size={15} aria-hidden />
              Cadastrar "{patientQuery}" como novo paciente
            </button>
          )}
        </div>

        {showNewPatient && (
          <div className="flex flex-col gap-3 rounded-lg bg-surface px-3 py-3">
            <p className="text-sm font-medium text-text">Novo paciente</p>
            <Input label="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <Input label="Telefone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(98) 99999-9999" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowNewPatient(false)}>
                Voltar
              </Button>
              <Button size="sm" variant="primary" disabled={!newName.trim()} onClick={saveNewPatient}>
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
            setTime(null);
          }}
          options={professionals.map((p) => ({ value: p.id, label: `${p.name} · ${p.specialty}` }))}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
          <Input
            type="date"
            label="Data"
            required
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime(null);
            }}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Horário</span>
            {slots.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={`h-8 rounded-full border px-3 text-sm tabular transition-colors ${t === time ? "border-accent bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:text-text"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Sem horários livres nesta data.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text">Procedimentos</span>
            <Button size="xs" variant="ghost" icon={Add} onClick={addRow}>
              Adicionar
            </Button>
          </div>
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-1 gap-2 rounded-lg bg-surface px-3 py-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <Select
                label="Procedimento"
                value={row.procedureId}
                onChange={(e) => updateRow(row.key, { procedureId: e.target.value })}
                options={procedures.map((p) => ({ value: p.id, label: p.name }))}
              />
              <Select
                label="Particular / convênio"
                value={row.insuranceId}
                onChange={(e) => updateRow(row.key, { insuranceId: e.target.value })}
                options={insurances.map((i) => ({ value: i.id, label: i.name }))}
              />
              <Input
                label="Valor"
                type="number"
                step="0.01"
                value={(row.priceCents / 100).toFixed(2)}
                onChange={(e) => updateRow(row.key, { priceCents: Math.round(Number(e.target.value || 0) * 100) })}
                wrapperClassName="w-28"
              />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={CloseCircle}
                aria-label="Remover procedimento"
                disabled={rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Switch checked={isEncaixe} onChange={setIsEncaixe} label="Encaixe" description="Agenda fora do intervalo padrão de horários." />
          <Switch checked={isRetorno} onChange={setIsRetorno} label="Retorno" description="Consulta de acompanhamento, sem novo valor de procedimento." />
        </div>

        <Textarea label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>
    </Modal>
  );
}

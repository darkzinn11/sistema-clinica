"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PatientCombobox } from "@/components/app/patient-combobox";
import { createAppointmentAction } from "@/lib/actions";
import type { Insurance, Location, Patient, Procedure, Equipment } from "@/lib/types";

interface ProcedureRow {
  key: string;
  procedureId: string;
  durationMin: number;
  paymentMode: "particular" | "convenio";
  insuranceId?: string;
  priceCents: number;
  locationId?: string;
  equipmentId?: string;
}

function emptyRow(procedures: Procedure[]): ProcedureRow {
  const first = procedures[0];
  return {
    key: Math.random().toString(36).slice(2),
    procedureId: first?.id ?? "",
    durationMin: first?.defaultDurationMin ?? 30,
    paymentMode: "particular",
    priceCents: first?.defaultPriceCents ?? 0,
  };
}

export function AppointmentPanel({
  professionalId,
  dateIso,
  defaultTime,
  procedures,
  locations,
  equipment,
  insurances,
}: {
  professionalId: string;
  dateIso: string;
  defaultTime?: string;
  procedures: Procedure[];
  locations: Location[];
  equipment: Equipment[];
  insurances: Insurance[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [creatingPatient, setCreatingPatient] = useState<{ name: string } | null>(null);
  const [time, setTime] = useState(defaultTime ?? "14:00");
  const [isEncaixe, setIsEncaixe] = useState(false);
  const [isRetorno, setIsRetorno] = useState(false);
  const [rows, setRows] = useState<ProcedureRow[]>([emptyRow(procedures)]);
  const dialogRef = useRef<HTMLDivElement>(null);

  function resetAndClose() {
    setOpen(false);
    setError(null);
    setSelectedPatient(null);
    setCreatingPatient(null);
    setRows([emptyRow(procedures)]);
    setIsEncaixe(false);
    setIsRetorno(false);
  }

  function updateRow(key: string, patch: Partial<ProcedureRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onProcedureChange(key: string, procedureId: string) {
    const proc = procedures.find((p) => p.id === procedureId);
    updateRow(key, {
      procedureId,
      durationMin: proc?.defaultDurationMin ?? 30,
      priceCents: proc?.defaultPriceCents ?? 0,
    });
  }

  const totalCents = rows.reduce((sum, r) => sum + r.priceCents, 0);

  async function onSubmit(formData: FormData) {
    setError(null);
    if (!selectedPatient && !creatingPatient) {
      setError("Selecione um paciente existente ou cadastre um novo.");
      return;
    }
    const totalDuration = rows.reduce((sum, r) => sum + r.durationMin, 0) || 30;
    const [h, m] = time.split(":").map(Number);
    const startsAt = new Date(`${dateIso}T00:00:00`);
    startsAt.setHours(h, m, 0, 0);
    const endsAt = new Date(startsAt.getTime() + totalDuration * 60000);

    setSaving(true);
    const result = await createAppointmentAction({
      patientId: selectedPatient?.id,
      newPatient: creatingPatient
        ? {
            fullName: String(formData.get("fullName") ?? creatingPatient.name),
            mobilePhone: String(formData.get("mobilePhone") ?? ""),
            cpf: String(formData.get("cpf") ?? "") || undefined,
            hasNoCpf: formData.get("hasNoCpf") === "on",
            birthDate: String(formData.get("birthDate") ?? "") || undefined,
            sex: (String(formData.get("sex") ?? "") || undefined) as Patient["sex"],
            leadSource: String(formData.get("leadSource") ?? "") || undefined,
          }
        : undefined,
      professionalId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      isEncaixe,
      isRetorno,
      notes: String(formData.get("notes") ?? "") || undefined,
      procedures: rows.map((r) => ({
        procedureId: r.procedureId,
        durationMin: r.durationMin,
        paymentMode: r.paymentMode,
        insuranceId: r.paymentMode === "convenio" ? r.insuranceId : undefined,
        priceCents: r.priceCents,
        locationId: r.locationId,
        equipmentId: r.equipmentId,
      })),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    resetAndClose();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Novo agendamento</Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetAndClose();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-panel-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col gap-5 overflow-y-auto rounded-lg bg-surface-raised p-6 shadow-[var(--shadow-pop)]"
          >
            <div className="flex items-center justify-between">
              <h2 id="appointment-panel-title" className="text-lg font-semibold text-text">
                Novo agendamento
              </h2>
              <button
                aria-label="Fechar"
                onClick={resetAndClose}
                className="rounded-md p-1 text-text-muted hover:bg-surface"
              >
                ✕
              </button>
            </div>

            <form
              action={(fd) => onSubmit(fd)}
              className="flex flex-col gap-5"
            >
              {!selectedPatient && !creatingPatient && (
                <PatientCombobox
                  onSelect={setSelectedPatient}
                  onCreateNew={(name) => setCreatingPatient({ name })}
                />
              )}

              {selectedPatient && (
                <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                  <span className="text-base text-text">{selectedPatient.fullName}</span>
                  <button
                    type="button"
                    className="text-xs text-accent underline"
                    onClick={() => setSelectedPatient(null)}
                  >
                    trocar
                  </button>
                </div>
              )}

              {creatingPatient && (
                <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
                  <legend className="px-1 text-xs font-medium text-text-muted">
                    Cadastro rápido de paciente
                  </legend>
                  <Input label="Nome completo" name="fullName" defaultValue={creatingPatient.name} required />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Celular" name="mobilePhone" required placeholder="(00) 00000-0000" />
                    <Input label="CPF" name="cpf" placeholder="000.000.000-00" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-text-muted">
                    <input type="checkbox" name="hasNoCpf" /> Paciente sem CPF
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nascimento" name="birthDate" type="date" />
                    <div className="flex flex-col gap-1">
                      <label htmlFor="sex" className="text-xs font-medium text-text-muted">
                        Sexo
                      </label>
                      <select
                        id="sex"
                        name="sex"
                        className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text"
                      >
                        <option value="">Selecione</option>
                        <option value="feminino">Feminino</option>
                        <option value="masculino">Masculino</option>
                        <option value="indefinido">Indefinido</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="leadSource" className="text-xs font-medium text-text-muted">
                      Como conheceu a clínica
                    </label>
                    <select
                      id="leadSource"
                      name="leadSource"
                      className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text"
                    >
                      <option value="">Selecione</option>
                      <option value="indicacao">Indicação</option>
                      <option value="google">Google</option>
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="self-start text-xs text-accent underline"
                    onClick={() => setCreatingPatient(null)}
                  >
                    buscar paciente existente em vez disso
                  </button>
                </fieldset>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Horário"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={isEncaixe} onChange={(e) => setIsEncaixe(e.target.checked)} />
                    Encaixe
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={isRetorno} onChange={(e) => setIsRetorno(e.target.checked)} />
                    Retorno
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">Procedimentos</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setRows((prev) => [...prev, emptyRow(procedures)])}
                  >
                    + Adicionar
                  </Button>
                </div>
                {rows.map((row) => (
                  <div key={row.key} className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        aria-label="Procedimento"
                        value={row.procedureId}
                        onChange={(e) => onProcedureChange(row.key, e.target.value)}
                        className="h-10 rounded-md border border-border-input bg-bg px-2 text-base text-text"
                      >
                        {procedures.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Local"
                        value={row.locationId ?? ""}
                        onChange={(e) => updateRow(row.key, { locationId: e.target.value || undefined })}
                        className="h-10 rounded-md border border-border-input bg-bg px-2 text-base text-text"
                      >
                        <option value="">Local</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex items-center gap-1 text-sm text-text">
                        <input
                          type="radio"
                          name={`payment-${row.key}`}
                          checked={row.paymentMode === "particular"}
                          onChange={() => updateRow(row.key, { paymentMode: "particular" })}
                        />
                        Particular
                      </label>
                      <label className="flex items-center gap-1 text-sm text-text">
                        <input
                          type="radio"
                          name={`payment-${row.key}`}
                          checked={row.paymentMode === "convenio"}
                          onChange={() => updateRow(row.key, { paymentMode: "convenio" })}
                        />
                        Convênio
                      </label>
                      {row.paymentMode === "convenio" && (
                        <select
                          aria-label="Convênio"
                          value={row.insuranceId ?? ""}
                          onChange={(e) => updateRow(row.key, { insuranceId: e.target.value || undefined })}
                          className="h-9 rounded-md border border-border-input bg-bg px-2 text-sm text-text"
                        >
                          <option value="">Selecione</option>
                          {insurances.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        aria-label="Equipamento"
                        value={row.equipmentId ?? ""}
                        onChange={(e) => updateRow(row.key, { equipmentId: e.target.value || undefined })}
                        className="h-9 rounded-md border border-border-input bg-bg px-2 text-sm text-text"
                      >
                        <option value="">Sem equipamento</option>
                        {equipment.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name}
                          </option>
                        ))}
                      </select>
                      <span className="flex items-center text-sm text-text-muted">{row.durationMin} min</span>
                      <span className="flex items-center justify-end text-sm font-medium text-text">
                        {(row.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="self-end text-xs text-danger underline"
                        onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      >
                        remover
                      </button>
                    )}
                  </div>
                ))}
                <div className="text-right text-sm font-semibold text-text">
                  Total: {(totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="notes" className="text-xs font-medium text-text-muted">
                  Observações
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  className="rounded-md border border-border-input bg-bg px-3 py-2 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={resetAndClose}>
                  Cancelar
                </Button>
                <Button type="submit" loading={saving}>
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

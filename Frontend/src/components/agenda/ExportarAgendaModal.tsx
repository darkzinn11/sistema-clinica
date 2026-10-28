import { DocumentDownload, Filter, TickCircle } from "iconsax-reactjs";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, Switch } from "@/components/ui/overlay";
import { Segmented } from "@/components/ui/tabs";
import type { AgendaAppointment } from "@/lib/agenda/model";
import { useAuth } from "@/lib/auth/auth";
import { formatPhone } from "@/lib/pacientes/options";
import { cn } from "@/lib/cn";

type Scope = "completa" | "filtrada";

/** Cartão de escolha (rádio) com título, resumo e conteúdo extra. */
function ScopeOption({
  checked,
  disabled,
  onSelect,
  title,
  meta,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  meta: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
        checked ? "border-accent" : "border-border hover:border-border-strong",
        disabled && "cursor-not-allowed opacity-55 hover:border-border",
      )}
    >
      <input type="radio" name="escopo-exportacao" className="sr-only" checked={checked} disabled={disabled} onChange={onSelect} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-accent" : "border-border-input",
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-accent" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-semibold text-text">{title}</span>
        <span className="text-sm text-text-muted">{meta}</span>
        {children}
      </span>
    </label>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const activeCount = (list: AgendaAppointment[]) => list.filter((a) => !["cancelado_pelo_profissional", "desmarcado_pelo_paciente"].includes(a.status)).length;

/**
 * Exportação da agenda do dia em PDF. Duas decisões só: o que entra (tudo ou o filtrado) e como organizar;
 * telefone e valores são opcionais — valores começam desligados porque a lista costuma circular na recepção.
 */
export function ExportarAgendaModal({
  open,
  onClose,
  date,
  dateLabel,
  all,
  filtered,
  filters,
  professionals,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  dateLabel: string;
  all: AgendaAppointment[];
  filtered: AgendaAppointment[];
  /** Filtros ativos na tela, em texto curto ("Status: Confirmado"). */
  filters: string[];
  professionals: { id: string; name: string; specialty: string; color: string }[];
}) {
  const { session } = useAuth();
  const hasFilters = filters.length > 0;
  const [scope, setScope] = useState<Scope>(hasFilters ? "filtrada" : "completa");
  const [groupBy, setGroupBy] = useState<"profissional" | "horario">("profissional");
  const [includePhone, setIncludePhone] = useState(true);
  const [includeValues, setIncludeValues] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ao reabrir, o padrão acompanha os filtros do momento.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setScope(hasFilters ? "filtrada" : "completa");
      setError(null);
    }
  }

  const effectiveScope: Scope = hasFilters ? scope : "completa";
  const selection = effectiveScope === "filtrada" ? filtered : all;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { exportAgendaPdf } = await import("@/lib/agenda/export-pdf");
      await exportAgendaPdf({
        date,
        dateLabel,
        clinicName: session?.usuario.clinicaNome ?? "MultiSaúde",
        unitName: session?.usuario.unidadeNome ?? "",
        appointments: selection,
        professionals,
        filters: effectiveScope === "filtrada" ? filters : [],
        groupBy,
        includePhone,
        includeValues,
        formatPhone,
      });
      onClose();
    } catch {
      setError("Não foi possível gerar o PDF. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={DocumentDownload}
      title="Exportar agenda"
      description={`${dateLabel} · PDF pronto para imprimir ou enviar.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" icon={DocumentDownload} loading={busy} disabled={selection.length === 0} onClick={() => void download()}>
            Baixar PDF
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-semibold text-text">O que exportar</legend>
          <ScopeOption
            checked={effectiveScope === "completa"}
            onSelect={() => setScope("completa")}
            title="Agenda completa do dia"
            meta={`${plural(activeCount(all), "agendamento", "agendamentos")} · ${plural(new Set(all.map((a) => a.professionalId)).size, "profissional", "profissionais")}`}
          />
          <ScopeOption
            checked={effectiveScope === "filtrada"}
            disabled={!hasFilters}
            onSelect={() => setScope("filtrada")}
            title="Somente o que está filtrado"
            meta={hasFilters ? plural(activeCount(filtered), "agendamento", "agendamentos") : "Nenhum filtro aplicado na agenda agora."}
          >
            {hasFilters && (
              <span className="mt-1 flex flex-wrap gap-1.5">
                {filters.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-text-muted ring-1 ring-inset ring-border">
                    <Filter size={11} aria-hidden /> {f}
                  </span>
                ))}
              </span>
            )}
          </ScopeOption>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text">Organizar por</span>
          <Segmented<"profissional" | "horario">
            label="Organizar por"
            size="sm"
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { value: "profissional", label: "Profissional" },
              { value: "horario", label: "Horário" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <Switch checked={includePhone} onChange={setIncludePhone} label="Telefone do paciente" description="Útil para a rodada de confirmações." />
          <Switch checked={includeValues} onChange={setIncludeValues} label="Valores" description="Preço de cada atendimento e o total previsto do dia." />
        </div>

        <p className="flex items-start gap-2 text-xs text-text-muted">
          <TickCircle size={14} aria-hidden className="mt-px shrink-0 text-accent" />
          Cancelados aparecem na lista, mas não entram nas contagens nem no total.
        </p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

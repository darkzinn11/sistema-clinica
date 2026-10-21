import { ArrowLeft2, Calendar, ChemicalGlass, Eraser, Health, Personalcard, Refresh2, Scanning, TickCircle, Ticket2, UserTick } from "iconsax-reactjs";
import { IconCircle } from "@/components/ui/icon-circle";
import type { Icon as IconType } from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { patients } from "@/lib/mock/core";
import type { TicketTypeCode } from "@/lib/mock/recepcao";
import { TICKET_TYPES } from "@/lib/mock/recepcao";

type Step = "inicio" | "cpf" | "servico" | "preferencial" | "confirmacao";

const SERVICE_ICON: Record<TicketTypeCode, IconType> = {
  CON: Health,
  EXM: Scanning,
  LAB: ChemicalGlass,
  RET: Refresh2,
};

const SERVICE_SERIES: Record<TicketTypeCode, number> = { CON: 1, EXM: 2, LAB: 3, RET: 4 };

const AUTO_RETURN_MS = 8000;
const CPF_LENGTH = 11;

function formatCpf(digitsStr: string): string {
  const d = digitsStr.padEnd(CPF_LENGTH, "_");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export default function Totem() {
  const [step, setStep] = useState<Step>("inicio");
  const [type, setType] = useState<TicketTypeCode | null>(null);
  const [cpf, setCpf] = useState("");
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [ticket, setTicket] = useState<{ code: string; waitMin: number } | null>(null);
  const [counters, setCounters] = useState<Record<TicketTypeCode, number>>({ CON: 18, EXM: 9, LAB: 6, RET: 4 });
  const [now, setNow] = useState(() => new Date());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function reset() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStep("inicio");
    setType(null);
    setCpf("");
    setVisitorName(null);
    setTicket(null);
  }

  function pressKey(key: (typeof KEYPAD_KEYS)[number]) {
    if (key === "back") return setCpf((prev) => prev.slice(0, -1));
    if (key === "clear") return setCpf("");
    setCpf((prev) => (prev.length < CPF_LENGTH ? prev + key : prev));
  }

  function confirmCpf() {
    const found = patients.find((p) => p.cpf.replace(/\D/g, "") === cpf);
    setVisitorName(found ? found.name.split(" ")[0] : null);
    setStep("servico");
  }

  function skipCpf() {
    setCpf("");
    setVisitorName(null);
    setStep("servico");
  }

  function chooseType(t: TicketTypeCode) {
    setType(t);
    setStep("preferencial");
  }

  function choosePreferential(pref: boolean) {
    if (!type) return;
    const n = counters[type] + 1;
    setCounters((prev) => ({ ...prev, [type]: n }));
    const code = `${type}${pref ? " P" : ""} ${String(n).padStart(2, "0")}`;
    setTicket({ code, waitMin: 4 + n * 2 });
    setStep("confirmacao");
    timeoutRef.current = setTimeout(reset, AUTO_RETURN_MS);
  }

  const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex min-h-24 items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <BrandLogo className="h-14 w-auto max-w-[52vw] shrink-0 object-contain" />
        <div className="text-right">
          <p className="font-display text-2xl font-semibold tabular">{clock}</p>
          <p className="text-sm capitalize text-text-muted">{dateLabel}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        {step === "inicio" && (
          <button
            type="button"
            onClick={() => setStep("cpf")}
            className="flex min-h-[420px] w-full max-w-3xl flex-col items-center justify-center gap-6 rounded-xl bg-surface-raised shadow-pop transition-transform active:scale-[0.99]"
          >
            <IconCircle tone="accent" size="hero"><Ticket2 size={42} aria-hidden /></IconCircle>
            <p className="font-display text-display font-semibold tracking-tight">Bem-vindo</p>
            <p className="max-w-md text-center text-lg text-text-muted">Toque na tela para retirar sua senha de atendimento</p>
          </button>
        )}

        {step === "cpf" && (
          <div className="flex w-full max-w-xl flex-col items-center gap-5">
            <IconCircle tone="accent" size="hero"><Personalcard size={38} aria-hidden /></IconCircle>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className="font-display text-2xl font-semibold">Informe seu CPF</p>
              <p className="max-w-sm text-base text-text-muted">Agiliza seu atendimento e mantém seu histórico atualizado</p>
            </div>

            <p className="font-display text-4xl font-semibold tracking-[0.08em] tabular text-text">{formatCpf(cpf)}</p>

            <div className="grid w-full max-w-xs grid-cols-3 gap-3">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => pressKey(key)}
                  aria-label={key === "back" ? "Apagar" : key === "clear" ? "Limpar" : key}
                  className="flex h-16 items-center justify-center rounded-xl bg-surface-raised text-2xl font-semibold text-text shadow-pop transition-transform active:scale-[0.96]"
                >
                  {key === "back" ? <ArrowLeft2 size={22} aria-hidden /> : key === "clear" ? <Eraser size={20} aria-hidden /> : key}
                </button>
              ))}
            </div>

            <div className="mt-2 flex w-full max-w-xs flex-col items-center gap-3">
              <button
                type="button"
                onClick={confirmCpf}
                disabled={cpf.length !== CPF_LENGTH}
                className="ms-gradient-button flex h-14 w-full items-center justify-center rounded-full text-lg font-semibold text-on-accent shadow-card disabled:pointer-events-none disabled:opacity-40"
              >
                Confirmar
              </button>
              <button type="button" onClick={skipCpf} className="text-sm font-medium text-text-subtle underline-offset-4 hover:text-text-muted hover:underline">
                Prefiro não informar
              </button>
            </div>

            <p className="max-w-sm text-center text-xs text-text-subtle">O CPF é opcional, conforme a legislação, mas recomendamos informar.</p>
          </div>
        )}

        {step === "servico" && (
          <div className="flex w-full max-w-4xl flex-col gap-8">
            <p className="text-center font-display text-2xl font-semibold">
              {visitorName ? `Olá, ${visitorName}! Qual atendimento você deseja?` : "Qual atendimento você deseja?"}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {TICKET_TYPES.map((t) => {
                const Icon = SERVICE_ICON[t.code];
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => chooseType(t.code)}
                    style={{ background: `var(--c-series-${SERVICE_SERIES[t.code]})` }}
                    className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl text-on-accent shadow-pop transition-transform active:scale-[0.98]"
                  >
                    <Icon size={40} aria-hidden />
                    <span className="font-display text-xl font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "preferencial" && (
          <div className="flex w-full max-w-2xl flex-col items-center gap-8">
            <IconCircle tone="accent" size="hero"><UserTick size={40} aria-hidden /></IconCircle>
            <p className="text-center font-display text-2xl font-semibold">Atendimento preferencial?</p>
            <p className="max-w-md text-center text-base text-text-muted">Idoso, gestante, pessoa com deficiência ou lactante</p>
            <div className="grid w-full grid-cols-2 gap-5">
              <button
                type="button"
                onClick={() => choosePreferential(true)}
                className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl bg-success-bg text-success shadow-pop transition-transform active:scale-[0.98]"
              >
                <IconCircle tone="success" size="3xl"><TickCircle size={26} aria-hidden /></IconCircle>
                <span className="font-display text-xl font-semibold">Sim</span>
              </button>
              <button
                type="button"
                onClick={() => choosePreferential(false)}
                className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-raised text-text shadow-pop transition-transform active:scale-[0.98]"
              >
                <IconCircle tone="neutral" size="3xl"><ArrowLeft2 size={26} className="rotate-180" aria-hidden /></IconCircle>
                <span className="font-display text-xl font-semibold">Não</span>
              </button>
            </div>
          </div>
        )}

        {step === "confirmacao" && ticket && (
          <button type="button" onClick={reset} className="flex w-full max-w-3xl flex-col items-center gap-6 rounded-xl bg-surface-raised p-10 text-center shadow-pop">
            <IconCircle tone="success" size="hero"><Calendar size={40} aria-hidden /></IconCircle>
            <p className="text-lg text-text-muted">{visitorName ? `Obrigado, ${visitorName}! Sua senha é` : "Sua senha é"}</p>
            <p className="font-display text-display font-semibold tracking-tight text-accent">{ticket.code}</p>
            <p className="text-xl font-medium">Retire seu comprovante</p>
            <p className="text-base text-text-muted">Espera estimada: cerca de {ticket.waitMin} minutos</p>
            <p className="text-sm text-text-subtle">Toque na tela para voltar ao início</p>
          </button>
        )}
      </main>
    </div>
  );
}

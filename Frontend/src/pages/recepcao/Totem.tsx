import { ArrowLeft2, ChemicalGlass, Eraser, Health, Personalcard, Refresh2, Scanning, TickCircle, Ticket2, UserTick } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { ApiError } from "@/lib/api/client";
import { useGenerateTotemTicket, useTotemTypes, type TotemTicket, type TotemType } from "@/lib/api/recepcao";
import { clearDevice, loadDevice, type StoredDevice } from "@/lib/device/storage";

type Step = "inicio" | "cpf" | "servico" | "confirmacao";

const AUTO_RETURN_MS = 8000;
const IDLE_RESET_MS = 60_000;
const CPF_LENGTH = 11;
const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

function validCpf(cpf: string) {
  if (cpf.length !== CPF_LENGTH || /^(\d)\1+$/.test(cpf)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const digit = (sum * 10) % 11;
    return (digit === 10 ? 0 : digit) === Number(cpf[len]);
  };
  return check(9) && check(10);
}

function formatCpf(digitsStr: string): string {
  const d = digitsStr.padEnd(CPF_LENGTH, "_");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

// Os tipos de senha são configurados pela clínica: o ícone sai do nome, com um genérico de reserva.
function serviceIcon(type: TotemType): IconType {
  const name = type.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/exame|imagem|raio|ultra/.test(name)) return Scanning;
  if (/labor|coleta|sangue/.test(name)) return ChemicalGlass;
  if (/retorno/.test(name)) return Refresh2;
  if (/consulta|clinic|medic/.test(name)) return Health;
  return type.preferencial ? UserTick : Ticket2;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 429) return "Aguarde um instante e tente de novo.";
  if (error instanceof ApiError) return error.message;
  return "Sem conexão com o sistema. Tente de novo ou peça ajuda na recepção.";
}

export default function Totem() {
  const [device, setDevice] = useState<StoredDevice | null>(() => loadDevice("totem"));
  const [step, setStep] = useState<Step>("inicio");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TotemTicket | null>(null);
  const [now, setNow] = useState(() => new Date());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const types = useTotemTypes(device?.token);
  const generate = useGenerateTotemTicket();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Token revogado ou inválido: volta para a tela de pareamento.
  useEffect(() => {
    if (types.error instanceof ApiError && types.error.status === 401) { clearDevice("totem"); setDevice(null); }
  }, [types.error]);

  // 60 s sem toque em qualquer etapa: volta ao início e limpa o CPF.
  useEffect(() => {
    if (step === "inicio") return undefined;
    const id = setTimeout(reset, IDLE_RESET_MS);
    return () => clearTimeout(id);
  }, [step, cpf]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  function reset() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStep("inicio");
    setCpf("");
    setCpfError(null);
    setTicket(null);
    generate.reset();
  }

  function pressKey(key: (typeof KEYPAD_KEYS)[number]) {
    setCpfError(null);
    if (key === "back") return setCpf((prev) => prev.slice(0, -1));
    if (key === "clear") return setCpf("");
    setCpf((prev) => (prev.length < CPF_LENGTH ? prev + key : prev));
  }

  function confirmCpf() {
    if (!validCpf(cpf)) { setCpfError("CPF inválido, confira os números."); return; }
    setStep("servico");
  }

  function skipCpf() {
    setCpf("");
    setCpfError(null);
    setStep("servico");
  }

  function chooseType(type: TotemType) {
    if (!device) return;
    generate.mutate({ tipoId: type.id, cpf: cpf || undefined, token: device.token }, {
      onSuccess: (value) => {
        // O CPF sai do estado assim que a senha é emitida.
        setCpf("");
        setTicket(value);
        setStep("confirmacao");
        timeoutRef.current = setTimeout(reset, AUTO_RETURN_MS);
      },
    });
  }

  if (!device) return <PareamentoDispositivo onPaired={setDevice} />;

  const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const options = types.data ?? [];

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
              <p className="font-display text-2xl font-semibold">Digite o CPF do paciente</p>
              <p className="max-w-sm text-base text-text-muted">Agiliza o atendimento na recepção</p>
            </div>
            <p aria-live="polite" aria-label={`CPF digitado: ${cpf.length} de ${CPF_LENGTH} números`} className="font-display text-4xl font-semibold tracking-[0.08em] tabular text-text">{formatCpf(cpf)}</p>
            {cpfError && <p role="alert" className="text-base font-medium text-danger">{cpfError}</p>}
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
              <Button variant="secondary" size="lg" className="w-full justify-center" onClick={skipCpf}>
                Não tenho / não quero informar
              </Button>
            </div>
            <p className="max-w-sm text-center text-xs text-text-subtle">O CPF é opcional. Ele só vincula a senha ao atendimento; o totem não consulta o cadastro.</p>
          </div>
        )}

        {step === "servico" && (
          <div className="flex w-full max-w-4xl flex-col gap-8">
            <p className="text-center font-display text-2xl font-semibold">Qual atendimento você deseja?</p>
            {types.isPending ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => <div key={i} className="min-h-[160px] animate-pulse rounded-xl bg-surface-raised" />)}
              </div>
            ) : types.isError || options.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-xl bg-surface-raised p-10 text-center shadow-pop">
                <p className="text-lg text-text-muted">{types.isError ? errorMessage(types.error) : "Nenhum atendimento disponível no momento. Procure a recepção."}</p>
                {types.isError && <Button size="lg" onClick={() => void types.refetch()}>Tentar de novo</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {options.map((type, index) => {
                  const Icon = serviceIcon(type);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      disabled={generate.isPending}
                      onClick={() => chooseType(type)}
                      style={{ background: `var(--c-series-${(index % 4) + 1})` }}
                      className={`relative flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl text-on-accent shadow-pop transition-transform active:scale-[0.98] disabled:opacity-60 ${type.preferencial ? "ring-4 ring-warning ring-offset-4 ring-offset-bg" : ""}`}
                    >
                      <Icon size={40} aria-hidden />
                      <span className="font-display text-xl font-semibold">{type.nome}</span>
                      {type.preferencial && <span className="rounded-full bg-black/20 px-3 py-1 text-sm font-medium">Preferencial · idoso, gestante, PcD, lactante</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {generate.isError && <p role="alert" className="text-center text-lg font-medium text-danger">{errorMessage(generate.error)}</p>}
            <div className="flex justify-center">
              <Button variant="secondary" size="lg" icon={ArrowLeft2} onClick={() => setStep("cpf")}>Voltar</Button>
            </div>
          </div>
        )}

        {step === "confirmacao" && ticket && (
          <button type="button" onClick={reset} className="flex w-full max-w-3xl flex-col items-center gap-6 rounded-xl bg-surface-raised p-10 text-center shadow-pop">
            <IconCircle tone="success" size="hero"><TickCircle size={40} aria-hidden /></IconCircle>
            <p className="text-lg text-text-muted">Sua senha é</p>
            <p className="font-display text-display font-semibold tracking-tight text-accent">{ticket.codigo}</p>
            <p className="text-xl font-medium">{ticket.tipoNome}</p>
            <p className="text-base text-text-muted">Aguarde ser chamado no painel</p>
            <p className="text-sm text-text-subtle">Toque na tela para voltar ao início</p>
          </button>
        )}
      </main>

      {step === "inicio" && (
        <footer className="flex justify-end px-6 pb-5 sm:px-10">
          <Button variant="secondary" size="sm" onClick={() => { clearDevice("totem"); setDevice(null); }}>Trocar dispositivo</Button>
        </footer>
      )}
    </div>
  );
}

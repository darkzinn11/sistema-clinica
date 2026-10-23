import { ChemicalGlass, Health, Refresh2, Scanning, TickCircle, UserTick } from "iconsax-reactjs";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { ApiError } from "@/lib/api/client";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { clearDevice, loadDevice, type StoredDevice } from "@/lib/device/storage";
import { useGenerateTotemTicket, useTotemTypes, type TotemType } from "@/lib/api/recepcao";

type Step = "servico" | "preferencial" | "resultado";
type Service = { key: string; label: string; icon: typeof Health; series: number; normal?: TotemType; preferential?: TotemType };

const SERVICE_ORDER = ["consulta", "exames", "laboratório", "retorno"];
const SERVICE_STYLE: Record<string, { icon: typeof Health; series: number }> = {
  consulta: { icon: Health, series: 1 },
  exames: { icon: Scanning, series: 2 },
  laboratório: { icon: ChemicalGlass, series: 3 },
  retorno: { icon: Refresh2, series: 4 },
};

function serviceKey(name: string) {
  return name.replace(/\s+preferencial\s*$/i, "").trim().toLocaleLowerCase("pt-BR");
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Totem() {
  const [device, setDevice] = useState<StoredDevice | null>(() => loadDevice("totem"));
  const [step, setStep] = useState<Step>("servico");
  const [selected, setSelected] = useState<Service | null>(null);
  const [result, setResult] = useState<{ codigo: string; tipoNome: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const types = useTotemTypes(device?.token);
  const generate = useGenerateTotemTicket();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step !== "resultado") return;
    const timer = window.setTimeout(() => {
      setResult(null);
      setSelected(null);
      setMessage(null);
      setStep("servico");
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (types.error instanceof ApiError && types.error.status === 401) {
      clearDevice("totem");
      setDevice(null);
    }
  }, [types.error]);

  const services = useMemo(() => {
    const grouped = new Map<string, Service>();
    for (const type of types.data ?? []) {
      const key = serviceKey(type.nome);
      const style = SERVICE_STYLE[key] ?? { icon: Health, series: (grouped.size % 4) + 1 };
      const current = grouped.get(key) ?? { key, label: key.replace(/^./, (letter) => letter.toUpperCase()), ...style };
      if (type.preferencial) current.preferential = type;
      else current.normal = type;
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => {
      const aIndex = SERVICE_ORDER.indexOf(a.key);
      const bIndex = SERVICE_ORDER.indexOf(b.key);
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
    });
  }, [types.data]);

  function chooseService(service: Service) {
    setSelected(service);
    setMessage(null);
    setStep("preferencial");
  }

  function choosePriority(preferential: boolean) {
    if (!selected || !device) return;
    const type = preferential ? selected.preferential : selected.normal;
    if (!type) {
      setMessage(`A fila ${preferential ? "preferencial" : "normal"} ainda não está configurada para este atendimento.`);
      return;
    }
    setMessage(null);
    generate.mutate({ tipoId: type.id, token: device.token }, {
      onSuccess: (value) => {
        setResult(value);
        setStep("resultado");
      },
      onError: (error) => setMessage(error instanceof ApiError && error.status === 429 ? "Aguarde um instante e tente de novo." : error instanceof ApiError ? error.message : "Não foi possível gerar a senha."),
    });
  }

  if (!device) return <PareamentoDispositivo onPaired={setDevice} />;

  return (
    <main className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex min-h-24 items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <BrandLogo className="h-14 w-auto max-w-[52vw] shrink-0 object-contain" />
        <div className="text-right"><p className="font-display text-2xl font-semibold tabular">{formatClock(now)}</p><p className="text-sm capitalize text-text-muted">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p></div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        {step === "servico" && <div className="flex w-full max-w-4xl flex-col gap-8"><p className="text-center font-display text-2xl font-semibold">Qual atendimento você deseja?</p>{types.isPending ? <p className="text-center text-text-muted">Carregando atendimentos…</p> : types.isError ? <p role="alert" className="text-center text-danger">{types.error.message}</p> : <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">{services.map((service) => { const Icon = service.icon; return <button key={service.key} type="button" onClick={() => chooseService(service)} disabled={generate.isPending} style={{ background: `var(--c-series-${service.series})` }} className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl text-on-accent shadow-pop transition-transform active:scale-[0.98] disabled:opacity-50"><Icon size={40} aria-hidden /><span className="font-display text-xl font-semibold">{service.label}</span></button>; })}</div>}</div>}

        {step === "preferencial" && selected && <div className="flex w-full max-w-2xl flex-col items-center gap-8"><button type="button" onClick={() => setStep("servico")} className="self-start text-sm text-text-muted underline">Voltar</button><IconCircle tone="accent" size="hero"><UserTick size={40} aria-hidden /></IconCircle><p className="text-center font-display text-2xl font-semibold">{selected.label}: escolha sua senha</p><p className="max-w-md text-center text-base text-text-muted">Você precisa de atendimento preferencial?</p><div className="grid w-full grid-cols-2 gap-5"><button type="button" onClick={() => choosePriority(false)} disabled={generate.isPending || !selected.normal} className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-raised text-text shadow-pop transition-transform active:scale-[0.98] disabled:opacity-50"><span className="font-display text-xl font-semibold">Normal</span></button><button type="button" onClick={() => choosePriority(true)} disabled={generate.isPending || !selected.preferential} className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-raised text-text shadow-pop transition-transform active:scale-[0.98] disabled:opacity-50"><IconCircle tone="success" size="3xl"><TickCircle size={26} aria-hidden /></IconCircle><span className="font-display text-xl font-semibold">Preferencial</span></button></div>{generate.isPending && <p className="text-text-muted">Gerando sua senha…</p>}{message && <p role="alert" className="text-center text-danger">{message}</p>}</div>}

        {step === "resultado" && result && <button type="button" onClick={() => { setResult(null); setSelected(null); setStep("servico"); }} className="flex w-full max-w-3xl flex-col items-center gap-6 rounded-xl bg-surface-raised p-10 text-center shadow-pop"><IconCircle tone="success" size="hero"><TickCircle size={40} aria-hidden /></IconCircle><p className="text-lg text-text-muted">Sua senha é</p><p className="font-display text-display font-semibold tracking-tight text-accent">{result.codigo}</p><p className="text-xl font-medium">{result.tipoNome}</p><p className="text-base text-text-muted">Aguarde ser chamado no painel.</p><p className="text-sm text-text-subtle">Toque na tela para voltar ao início</p></button>}
      </main>

      <div className="px-6 pb-4 text-right"><Button variant="ghost" size="sm" onClick={() => { clearDevice("totem"); setDevice(null); }}>Trocar dispositivo</Button></div>
    </main>
  );
}

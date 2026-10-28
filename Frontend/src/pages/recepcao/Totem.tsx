import type { CSSProperties } from "react";
import { ChemicalGlass, Health, Refresh2, Scanning } from "iconsax-reactjs";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { clearDevice, loadDevice, type StoredDevice } from "@/lib/device/storage";
import { useGenerateTotemTicket, useTotemTypes, type TotemType } from "@/lib/api/recepcao";

type Step = "cpf" | "servico" | "preferencial" | "resultado";
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

/** Unidade proporcional ao frame do Figma (1920×1244): encolhe junto com a janela, sem estourar. */
const u = (n: number) => `calc(var(--u) * ${n})`;

/** Confere os dígitos verificadores no próprio totem; o cadastro nunca é consultado. */
function isValidCpf(value: string) {
  if (value.length !== 11 || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(value[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
}

function formatCpf(digits: string) {
  const p = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)];
  return p[3] ? `${p[0]}.${p[1]}.${p[2]}-${p[3]}` : p[2] ? `${p[0]}.${p[1]}.${p[2]}` : p[1] ? `${p[0]}.${p[1]}` : p[0];
}

const keyStyle: CSSProperties = {
  height: u(130), fontSize: u(56), background: "#FFF", border: `${u(2)} solid #D3EADB`, borderRadius: u(30),
  boxShadow: "0 3.558px 14.232px 0 rgba(27, 54, 35, 0.06)",
};

/** Botões Normal/Preferencial: brancos, borda verde clara e largura que acompanha o texto, como no Figma. */
const choiceStyle: CSSProperties = {
  height: u(241), padding: `0 ${u(239)}`, fontSize: u(45), background: "#FFF", border: `${u(2)} solid #D3EADB`, borderRadius: u(58),
  boxShadow: "0 28.464px 85.393px 0 rgba(27, 54, 35, 0.14), 0 3.558px 14.232px 0 rgba(27, 54, 35, 0.06)",
};

/** "Terça-Feira, 20 De Outubro", como no desenho do Figma. */
const formatTotemDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace(/(^|[ ,-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

export default function Totem() {
  const [device, setDevice] = useState<StoredDevice | null>(() => loadDevice("totem"));
  const [step, setStep] = useState<Step>("cpf");
  const [cpf, setCpf] = useState("");
  const [touch, setTouch] = useState(0);
  const [cpfChecked, setCpfChecked] = useState(false);
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

  function restart() {
    setResult(null);
    setSelected(null);
    setMessage(null);
    setCpf("");
    setStep("cpf");
  }

  useEffect(() => {
    if (step !== "resultado") return;
    const timer = window.setTimeout(restart, 8_000);
    return () => window.clearTimeout(timer);
  }, [step]);

  // 60 s sem toque em qualquer etapa: volta ao início e apaga o CPF digitado.
  useEffect(() => {
    if (step === "cpf" && !cpf) return;
    const timer = window.setTimeout(restart, 60_000);
    return () => window.clearTimeout(timer);
  }, [step, cpf, touch]);

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

  const cpfInvalid = cpfChecked && cpf.length === 11 && !isValidCpf(cpf);

  function typeDigit(d: string) {
    setCpfChecked(false);
    setCpf((v) => (v.length < 11 ? v + d : v));
  }

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
    generate.mutate({ tipoId: type.id, cpf: cpf || undefined, token: device.token }, {
      onSuccess: (value) => {
        setCpf("");
        setResult(value);
        setStep("resultado");
      },
      onError: (error) => setMessage(error instanceof ApiError && error.status === 429 ? "Aguarde um instante e tente de novo." : error instanceof ApiError ? error.message : "Não foi possível gerar a senha."),
    });
  }

  if (!device) return <PareamentoDispositivo onPaired={setDevice} />;

  return (
    <main onPointerDown={() => setTouch((n) => n + 1)} className="flex min-h-screen flex-col text-text" style={{ "--u": "min(calc(100vw / 1920), calc(100vh / 1244))",  background: "radial-gradient(51.27% 56.25% at 44.86% 41.63%, #FBFCFB 0%, #DDEEE3 100%)" } as CSSProperties}>
      <header className="flex items-start justify-between" style={{ padding: `${u(92)} ${u(78)} 0`, height: u(243) }}>
        <div style={{ height: u(100) }}><BrandLogo className="h-full w-auto object-contain" /></div>
        <div className="text-right"><p className="font-display font-semibold tabular" style={{ fontSize: u(50), lineHeight: 1.1 }}>{formatClock(now)}</p><p className="text-text-muted" style={{ fontSize: u(22) }}>{formatTotemDate(now)}</p></div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-start" style={{ padding: `0 ${u(78)}` }}>
        {step === "cpf" && (
          <div className="flex items-center justify-center" style={{ background: "#FFF", width: "100%", height: u(907), padding: u(90), gap: u(90), borderRadius: u(50), boxShadow: "0 0 24px 0 rgba(0, 0, 0, 0.12)" }}>
            <div className="flex flex-1 flex-col items-center" style={{ gap: u(36) }}>
              <p className="text-center font-display font-semibold text-text" style={{ fontSize: u(45), lineHeight: 1.2 }}>Digite o CPF <span className="text-accent">do paciente</span></p>
              <div className="flex w-full items-center justify-center tabular font-display font-semibold" aria-live="polite" style={{ height: u(130), fontSize: u(62), borderRadius: u(30), border: `${u(2)} solid ${cpfInvalid ? "var(--c-danger, #C0392B)" : "#D3EADB"}`, color: cpf ? "inherit" : "#B8C4BC" }}>
                {formatCpf(cpf) || "000.000.000-00"}
              </div>
              <p role="alert" className="text-danger" style={{ fontSize: u(28), minHeight: u(36) }}>{cpfInvalid ? "CPF inválido, confira os números." : ""}</p>
              <button type="button" disabled={cpf.length !== 11} onClick={() => (isValidCpf(cpf) ? setStep("servico") : setCpfChecked(true))} className="font-display font-semibold text-on-accent transition-transform active:scale-[0.98] disabled:opacity-40" style={{ width: "100%", height: u(120), fontSize: u(40), borderRadius: u(30), background: "var(--c-accent, #1E7B34)" }}>Continuar</button>
              <button type="button" onClick={() => { setCpf(""); setStep("servico"); }} className="font-display font-semibold text-text transition-transform active:scale-[0.98]" style={{ width: "100%", height: u(100), fontSize: u(32), borderRadius: u(30), border: `${u(2)} solid #D3EADB`, background: "#FFF" }}>Não tenho / não quero informar o CPF</button>
            </div>
            <div className="grid grid-cols-3" style={{ gap: u(24), width: u(640) }}>
              {["1","2","3","4","5","6","7","8","9"].map((d) => <button key={d} type="button" onClick={() => typeDigit(d)} className="font-display font-semibold text-text transition-transform active:scale-[0.96]" style={{ ...keyStyle }}>{d}</button>)}
              <button type="button" onClick={() => { setCpf(""); setCpfChecked(false); }} className="font-display font-semibold text-text-muted transition-transform active:scale-[0.96]" style={{ ...keyStyle, fontSize: u(30) }}>Limpar</button>
              <button type="button" onClick={() => typeDigit("0")} className="font-display font-semibold text-text transition-transform active:scale-[0.96]" style={{ ...keyStyle }}>0</button>
              <button type="button" aria-label="Apagar" onClick={() => { setCpf((v) => v.slice(0, -1)); setCpfChecked(false); }} className="font-display font-semibold text-text-muted transition-transform active:scale-[0.96]" style={{ ...keyStyle, fontSize: u(30) }}>⌫ Apagar</button>
            </div>
          </div>
        )}
        {step === "servico" && (
          <div className="relative flex flex-col items-center justify-center" style={{ background: "#FFF", width: "100%", height: u(907), padding: u(90), gap: u(10), borderRadius: u(50), boxShadow: "0 0 24px 0 rgba(0, 0, 0, 0.12)" }}>
            <button type="button" onClick={() => setStep("cpf")} className="absolute text-text-muted hover:text-text" style={{ top: u(50), left: u(70), fontSize: u(28) }}>← Voltar</button>
            <p className="text-center font-display font-semibold text-text" style={{ fontSize: u(45), lineHeight: 1.2, marginBottom: u(50) }}>Qual atendimento você deseja?</p>
            {types.isPending ? <p className="text-center text-text-muted">Carregando atendimentos…</p> : types.isError ? <p role="alert" className="text-center text-danger">{types.error.message}</p> : (
              <div className="grid w-full grid-cols-2" style={{ gap: u(35) }}>
                {services.map((service) => {
                  const Icon = service.icon;
                  return (
                    <button key={service.key} type="button" onClick={() => chooseService(service)} disabled={generate.isPending}
                      className="flex flex-col items-center justify-center text-on-accent transition-transform active:scale-[0.98] disabled:opacity-50"
                      style={{ background: `var(--c-series-${service.series})`, minHeight: u(284.643), gap: u(21.348), borderRadius: u(39.138), boxShadow: "0 28.464px 85.393px 0 rgba(27, 54, 35, 0.14), 0 3.558px 14.232px 0 rgba(27, 54, 35, 0.06)" }}>
                      <Icon size={70} style={{ width: u(70), height: u(70) }} aria-hidden />
                      <span className="font-display font-semibold" style={{ fontSize: u(35) }}>{service.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === "preferencial" && selected && (
          <div className="relative flex flex-col items-center justify-center" style={{ background: "#FFF", width: "100%", height: u(907), padding: u(90), gap: u(30), borderRadius: u(50), boxShadow: "0 0 24px 0 rgba(0, 0, 0, 0.12)" }}>
            <button type="button" onClick={() => setStep("servico")} className="absolute text-text-muted hover:text-text" style={{ top: u(50), left: u(70), fontSize: u(28) }}>← Voltar</button>
            <div className="flex items-center justify-center" style={{ gap: u(37) }}>
              <button type="button" onClick={() => choosePriority(false)} disabled={generate.isPending || !selected.normal} className="font-display font-semibold text-text transition-transform active:scale-[0.98] disabled:opacity-50" style={{ ...choiceStyle }}>Normal</button>
              <button type="button" onClick={() => choosePriority(true)} disabled={generate.isPending || !selected.preferential} className="font-display font-semibold text-text transition-transform active:scale-[0.98] disabled:opacity-50" style={{ ...choiceStyle }}>Preferencial</button>
            </div>
            {generate.isPending && <p className="text-text-muted" style={{ fontSize: u(28) }}>Gerando sua senha…</p>}
            {message && <p role="alert" className="text-center text-danger" style={{ fontSize: u(28) }}>{message}</p>}
          </div>
        )}

        {step === "resultado" && result && (
          <button type="button" onClick={restart} className="flex flex-col items-center justify-center text-center" style={{ background: "#FFF", width: "100%", height: u(907), padding: u(90), gap: u(20), borderRadius: u(50), boxShadow: "0 0 24px 0 rgba(0, 0, 0, 0.12)" }}>
            <p className="text-text-muted" style={{ fontSize: u(40) }}>Sua senha é</p>
            <p className="font-display font-semibold tabular text-accent" style={{ fontSize: u(260), lineHeight: 1, letterSpacing: "-0.02em" }}>{result.codigo}</p>
            <p className="font-display font-semibold text-text" style={{ fontSize: u(50), marginTop: u(10) }}>{result.tipoNome}</p>
            <p className="text-text-muted" style={{ fontSize: u(36), marginTop: u(40) }}>Aguarde ser chamado no painel.</p>
            <p className="text-text-subtle" style={{ fontSize: u(28) }}>Toque na tela para voltar ao início</p>
          </button>
        )}
      </div>

      <div className="px-6 pb-4 text-right"><Button variant="ghost" size="sm" onClick={() => { clearDevice("totem"); setDevice(null); }}>Trocar dispositivo</Button></div>
    </main>
  );
}

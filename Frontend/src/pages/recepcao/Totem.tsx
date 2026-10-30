import type { CSSProperties } from "react";
import { ArrowLeft, ChemicalGlass, Health, Refresh2, Scanning, TickCircle } from "iconsax-reactjs";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { ApiError } from "@/lib/api/client";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { clearDevice, loadDevice, type StoredDevice } from "@/lib/device/storage";
import { useGenerateTotemTicket, useTotemTypes, type TotemType } from "@/lib/api/recepcao";

type Step = "cpf" | "servico" | "preferencial" | "obrigado";

/** Tempo da mensagem de despedida antes de voltar sozinho ao início. */
const THANKS_MS = 5_000;
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

/**
 * Unidade proporcional ao frame do Figma (1920×1244): encolhe junto com a janela, sem estourar.
 * Em tablet na vertical a base vira um quadro em pé (1200×1920) e o teclado desce para baixo do CPF.
 */
const u = (n: number) => `calc(var(--u) * ${n})`;
const UNIT = "[--u:min(calc(100vw/1920),calc(100vh/1244))] portrait:[--u:min(calc(100vw/1200),calc(100vh/1920))]";
/** Card de cada etapa: altura do Figma na horizontal; na vertical ocupa o espaço que sobra. */
const STEP_CARD = "landscape:h-[calc(var(--u)*907)] portrait:flex-1";

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
  height: u(130), fontSize: u(56), background: "#FFF", border: `${u(2)} solid #E0E0E0`, borderRadius: u(30),
  boxShadow: "0 3.558px 14.232px 0 rgba(27, 54, 35, 0.06)",
};

/** Botões Normal/Preferencial: brancos, borda verde clara e largura que acompanha o texto, como no Figma. */
const choiceStyle: CSSProperties = {
  height: u(241), fontSize: u(45), background: "#FFF", border: `${u(2)} solid #E0E0E0`, borderRadius: u(58),
  boxShadow: "0 28.464px 85.393px 0 rgba(27, 54, 35, 0.14), 0 3.558px 14.232px 0 rgba(27, 54, 35, 0.06)",
};
/** Na vertical os dois botões empilham e ocupam a largura toda, em vez do recuo lateral do Figma. */
const CHOICE_WIDTH = "landscape:px-[calc(var(--u)*239)] portrait:w-full";

/** Voltar: no mesmo estilo das teclas Limpar/Apagar (branco, borda verde clara, cantos de 30). */
const backStyle: CSSProperties = {
  ...keyStyle, height: u(90), padding: `0 ${u(36)} 0 ${u(28)}`, gap: u(12), fontSize: u(30),
};

/** Colunas da grade de atendimentos: nunca sobra buraco nem card esticado sozinho na última linha. */
function serviceGrid(count: number) {
  const landscape = count === 4 ? "landscape:grid-cols-2" : count >= 3 ? "landscape:grid-cols-3" : count === 2 ? "landscape:grid-cols-2" : "landscape:grid-cols-1";
  const portrait = count % 2 === 0 ? "portrait:grid-cols-2" : "portrait:grid-cols-1";
  return `${landscape} ${portrait}`;
}

/** Cards das etapas com Voltar: o topo tem menos respiro, porque é ali que fica a linha do título. */
const stepCardStyle: CSSProperties = { background: "#FFF", width: "100%", padding: `${u(50)} ${u(90)} ${u(90)}`, gap: u(20), borderRadius: u(50) };

/** Voltar no canto do card; o título fica junto dos botões, no bloco centralizado da etapa. */
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="flex items-center self-start font-display font-semibold text-text-muted transition-transform active:scale-[0.96]" style={{ ...backStyle }}>
      <ArrowLeft style={{ width: u(30), height: u(30) }} aria-hidden />Voltar
    </button>
  );
}

function StepTitle({ children }: { children: string }) {
  return <p className="text-center font-display font-semibold text-text" style={{ fontSize: u(45), lineHeight: 1.2 }}>{children}</p>;
}

/** Despedida depois de gerar a senha: evita o salto direto para o CPF. Toque volta antes da hora. */
function ThanksStep({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onDone}
      initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center text-center ${STEP_CARD}`}
      style={{ background: "#FFF", width: "100%", padding: u(90), gap: u(28), borderRadius: u(50) }}
    >
      <motion.span
        initial={{ scale: reduced ? 1 : 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", visualDuration: 0.45, bounce: 0.3, delay: 0.1 }}
        className="flex items-center justify-center rounded-full bg-success-bg text-success"
        style={{ width: u(150), height: u(150) }}
      >
        <TickCircle variant="Bold" style={{ width: u(90), height: u(90) }} aria-hidden />
      </motion.span>
      <p className="font-display font-semibold text-text" style={{ fontSize: u(64), lineHeight: 1.1 }}>Obrigado!</p>
      <p className="font-display font-semibold text-accent" style={{ fontSize: u(40) }}>Retire sua senha impressa</p>
      <p className="text-text-muted" style={{ fontSize: u(32), maxWidth: u(900) }}>Aguarde ser chamado no painel. Desejamos um ótimo atendimento!</p>
      <span aria-hidden className="overflow-hidden rounded-full" style={{ width: u(320), height: u(8), marginTop: u(30), background: "#E3F0E7" }}>
        <motion.span
          className="block h-full rounded-full"
          style={{ background: "var(--c-accent, #1E7B34)", transformOrigin: "left" }}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: THANKS_MS / 1000, ease: "linear" }}
        />
      </span>
    </motion.button>
  );
}

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
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const types = useTotemTypes(device?.token);
  const generate = useGenerateTotemTicket();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  function restart() {
    setSelected(null);
    setMessage(null);
    setCpf("");
    setStep("cpf");
  }

  useEffect(() => {
    if (step !== "obrigado") return;
    const timer = window.setTimeout(restart, THANKS_MS);
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
    const all = types.data ?? [];
    const normalKeys = new Set(all.filter((type) => !type.preferencial).map((type) => serviceKey(type.nome)));
    // Preferencial sem atendimento de mesmo nome (ex.: um tipo só "Preferencial") não vira card: é a fila
    // preferencial de todos os atendimentos que não têm a sua própria. A escolha fica na etapa seguinte.
    const sharedPreferential = all.find((type) => type.preferencial && !normalKeys.has(serviceKey(type.nome)));
    for (const type of all) {
      const key = serviceKey(type.nome);
      if (type === sharedPreferential && normalKeys.size > 0) continue;
      const styleKey = SERVICE_ORDER.find((name) => key.startsWith(name));
      const series = SERVICE_STYLE[key]?.series ?? (grouped.size % 4) + 1;
      const style = { icon: (styleKey && SERVICE_STYLE[styleKey]?.icon) || Health, series };
      const current = grouped.get(key) ?? { key, label: type.preferencial ? key.replace(/^./, (letter) => letter.toUpperCase()) : type.nome, ...style };
      if (type.preferencial) current.preferential = type;
      else current.normal = type;
      grouped.set(key, current);
    }
    if (sharedPreferential) for (const service of grouped.values()) service.preferential ??= sharedPreferential;
    return [...grouped.values()].sort((a, b) => {
      const aIndex = SERVICE_ORDER.findIndex((name) => a.key.startsWith(name));
      const bIndex = SERVICE_ORDER.findIndex((name) => b.key.startsWith(name));
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
      // A senha sai impressa, então o código não aparece na tela: só uma despedida curta antes de voltar ao início.
      onSuccess: () => {
        setCpf("");
        setStep("obrigado");
      },
      onError: (error) => setMessage(error instanceof ApiError && error.status === 429 ? "Aguarde um instante e tente de novo." : error instanceof ApiError ? error.message : "Não foi possível gerar a senha."),
    });
  }

  if (!device) return <PareamentoDispositivo onPaired={setDevice} />;

  return (
    <main onPointerDown={() => setTouch((n) => n + 1)} className={`flex min-h-screen flex-col text-text ${UNIT}`} style={{ background: "radial-gradient(51.27% 56.25% at 44.86% 41.63%, #FBFCFB 0%, #E1F3E8 100%)" }}>
      <header className="flex items-start justify-between" style={{ padding: `${u(92)} ${u(78)} 0`, height: u(243) }}>
        <div style={{ height: u(100) }}><BrandLogo className="h-full w-auto object-contain" /></div>
        <div className="text-right"><p className="font-display font-semibold tabular" style={{ fontSize: u(50), lineHeight: 1.1 }}>{formatClock(now)}</p><p className="text-text-muted" style={{ fontSize: u(22) }}>{formatTotemDate(now)}</p></div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-start" style={{ padding: `0 ${u(78)} ${u(78)}` }}>
        {step === "cpf" && (
          <div className={`flex items-center justify-center portrait:flex-col ${STEP_CARD}`} style={{ background: "#FFF", width: "100%", padding: u(90), gap: u(90), borderRadius: u(50) }}>
            <div className="flex flex-col items-center landscape:flex-1 portrait:w-full" style={{ gap: u(36) }}>
              <p className="text-center font-display font-semibold text-text" style={{ fontSize: u(45), lineHeight: 1.2 }}>Digite o CPF <span className="text-accent">do paciente</span></p>
              <div className="flex w-full items-center justify-center tabular font-display font-semibold" aria-live="polite" style={{ height: u(130), fontSize: u(62), borderRadius: u(30), border: `${u(2)} solid ${cpfInvalid ? "var(--c-danger, #C0392B)" : "#E0E0E0"}`, color: cpf ? "inherit" : "#B8C4BC" }}>
                {formatCpf(cpf) || "000.000.000-00"}
              </div>
              <p role="alert" className="text-danger" style={{ fontSize: u(28), minHeight: u(36) }}>{cpfInvalid ? "CPF inválido, confira os números." : ""}</p>
              <button type="button" disabled={cpf.length !== 11} onClick={() => (isValidCpf(cpf) ? setStep("servico") : setCpfChecked(true))} className="font-display font-semibold text-on-accent transition-transform active:scale-[0.98] disabled:opacity-40" style={{ width: "100%", height: u(120), fontSize: u(40), borderRadius: u(30), background: "var(--c-accent, #1E7B34)" }}>Continuar</button>
              <button type="button" onClick={() => { setCpf(""); setStep("servico"); }} className="font-display font-semibold text-text transition-transform active:scale-[0.98]" style={{ width: "100%", height: u(100), fontSize: u(32), borderRadius: u(30), border: `${u(2)} solid #E0E0E0`, background: "#FFF" }}>Não quero informar o CPF</button>
            </div>
            <div className="grid grid-cols-3 landscape:w-[calc(var(--u)*640)] portrait:w-full" style={{ gap: u(24) }}>
              {["1","2","3","4","5","6","7","8","9"].map((d) => <button key={d} type="button" onClick={() => typeDigit(d)} className="font-display font-semibold text-text transition-transform active:scale-[0.96]" style={{ ...keyStyle }}>{d}</button>)}
              <button type="button" onClick={() => { setCpf(""); setCpfChecked(false); }} className="font-display font-semibold text-text-muted transition-transform active:scale-[0.96]" style={{ ...keyStyle, fontSize: u(30) }}>Limpar</button>
              <button type="button" onClick={() => typeDigit("0")} className="font-display font-semibold text-text transition-transform active:scale-[0.96]" style={{ ...keyStyle }}>0</button>
              <button type="button" aria-label="Apagar" onClick={() => { setCpf((v) => v.slice(0, -1)); setCpfChecked(false); }} className="font-display font-semibold text-text-muted transition-transform active:scale-[0.96]" style={{ ...keyStyle, fontSize: u(30) }}>⌫ Apagar</button>
            </div>
          </div>
        )}
        {step === "servico" && (
          <div className={`flex flex-col ${STEP_CARD}`} style={{ ...stepCardStyle }}>
            <BackButton onBack={() => setStep("cpf")} />
            <div className="flex w-full flex-1 flex-col justify-center" style={{ gap: u(50) }}>
            <StepTitle>Qual atendimento você deseja?</StepTitle>
            {types.isPending ? <p className="text-center text-text-muted" style={{ fontSize: u(30) }}>Carregando atendimentos…</p> : types.isError ? <p role="alert" className="text-center text-danger" style={{ fontSize: u(30) }}>{types.error.message}</p> : (
              <div className={`grid w-full ${serviceGrid(services.length)}`} style={{ gap: u(35) }}>
                {services.map((service) => {
                  const Icon = service.icon;
                  return (
                    <button key={service.key} type="button" onClick={() => chooseService(service)} disabled={generate.isPending}
                      className={`flex flex-col items-center justify-center text-on-accent transition-transform active:scale-[0.98] disabled:opacity-50`}
                      style={{ background: `var(--c-series-${service.series})`, minHeight: u(284.643), gap: u(21.348), borderRadius: u(39.138), boxShadow: "0 28.464px 85.393px 0 rgba(27, 54, 35, 0.14), 0 3.558px 14.232px 0 rgba(27, 54, 35, 0.06)" }}>
                      <Icon size={70} style={{ width: u(70), height: u(70) }} aria-hidden />
                      <span className="font-display font-semibold" style={{ fontSize: u(35) }}>{service.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {step === "preferencial" && selected && (
          <div className={`flex flex-col ${STEP_CARD}`} style={{ ...stepCardStyle }}>
            <BackButton onBack={() => setStep("servico")} />
            <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: u(50) }}>
            <StepTitle>{selected.label}</StepTitle>
            <div className="flex items-center justify-center portrait:w-full portrait:flex-col" style={{ gap: u(37) }}>
              <button type="button" onClick={() => choosePriority(false)} disabled={generate.isPending || !selected.normal} className={`font-display font-semibold text-text transition-transform active:scale-[0.98] disabled:opacity-50 ${CHOICE_WIDTH}`} style={{ ...choiceStyle }}>Normal</button>
              <button type="button" onClick={() => choosePriority(true)} disabled={generate.isPending || !selected.preferential} className={`font-display font-semibold text-text transition-transform active:scale-[0.98] disabled:opacity-50 ${CHOICE_WIDTH}`} style={{ ...choiceStyle }}>Preferencial</button>
            </div>
            {generate.isPending && <p className="text-text-muted" style={{ fontSize: u(28) }}>Gerando sua senha…</p>}
            {message && <p role="alert" className="text-center text-danger" style={{ fontSize: u(28) }}>{message}</p>}
            </div>
          </div>
        )}

        {step === "obrigado" && <ThanksStep onDone={restart} />}
      </div>

    </main>
  );
}

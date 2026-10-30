import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Location } from "iconsax-reactjs";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import chamadorBackground from "@/assets/chamador.svg";
import { BrandLogo } from "@/components/shell/brand-logo";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { usePanelCalls, type PanelCall } from "@/lib/api/painel";
import { clearDevice, loadDevice } from "@/lib/device/storage";

/** Unidade proporcional ao frame do Figma (1920×1080): a tela inteira escala junto com a TV. */
const u = (n: number) => `calc(var(--u) * ${n})`;

/**
 * Propaganda da TV: uma imagem `src/assets/banner-tv.*` substitui a peça; sem ela, entra a campanha
 * demonstrativa (Outubro Rosa) de `public/ads`, para o quadro de baixo nunca ficar vazio.
 */
const banners = import.meta.glob("../../assets/banner-tv.{png,jpg,jpeg,webp,svg}", { eager: true, import: "default" }) as Record<string, string>;
const customBanner = Object.values(banners)[0];
const banner = customBanner
  ? { src: customBanner, alt: "" }
  : { src: "/ads/outubro-rosa-slide.webp", alt: "Combo Outubro Rosa — cuidados essenciais para a saúde da mulher, 4x de R$ 90,00. Mais informações com nossos recepcionistas." };

const card: CSSProperties = { background: "#FFF", borderRadius: u(44) };
const ACCENT = "#1BBC5A";
const HISTORY_LIMIT = 4;
const FLASH_MS = 2400;

/** Identidade de uma chamada: muda também quando a mesma senha é chamada de novo. */
const callKey = (call: PanelCall | null) => (call ? `${call.codigo}-${call.chamadas}-${call.ultimaChamadaEm}` : null);

/** Aviso curto de duas notas (ding-dong), gerado na hora: sem arquivo de áudio para baixar. */
function playChime(ctx: AudioContext) {
  const start = ctx.currentTime + 0.02;
  for (const [freq, offset] of [[880, 0], [660, 0.32]]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start + offset);
    gain.gain.linearRampToValueAtTime(0.35, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + offset + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 1);
  }
}

export default function PainelTv() {
  const [device, setDevice] = useState(() => loadDevice("painel"));
  const [now, setNow] = useState(() => new Date());
  const [flash, setFlash] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const previousCall = useRef<string | null>(null);
  const reduced = useReducedMotion();
  const calls = usePanelCalls(device?.token ?? null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if ((calls.error as Error & { status?: number } | null)?.status === 401) {
      clearDevice("painel");
      setDevice(null);
    }
  }, [calls.error]);

  // Chamada nova (ou a mesma senha chamada de novo): o card pisca e, com o som ativado, toca o aviso.
  // A primeira leitura só registra o estado, para a TV não apitar ao ligar.
  const current = calls.data?.atual ?? null;
  const key = callKey(current);
  useEffect(() => {
    const previous = previousCall.current;
    previousCall.current = key;
    if (!key || !previous || key === previous) return undefined;
    if (audio.current?.state === "running") playChime(audio.current);
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [key]);

  // Ninguém interage com a TV, então não há botão de som: o áudio liga sozinho quando o navegador permite
  // (ex.: aberto com --autoplay-policy=no-user-gesture-required). Senão, qualquer clique ou tecla na
  // configuração da TV o libera; até lá o aviso de chamada nova é só visual.
  useEffect(() => {
    const ctx = new AudioContext();
    audio.current = ctx;
    const unlock = () => void ctx.resume();
    unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.current = null;
      void ctx.close();
    };
  }, []);

  if (!device) return <PareamentoDispositivo tipo="painel" testPath="/painel/chamadas" onPaired={setDevice} />;

  // "Chamando agora" já mostra a mais recente: a lista traz as anteriores, sem repetir.
  const history = (calls.data?.ultimas ?? []).filter((call) => callKey(call) !== key).slice(0, HISTORY_LIMIT);
  const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/(^|[ ,-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden text-text"
      style={{ "--u": "min(calc(100vw / 1920), calc(100vh / 1080))", background: `url(${chamadorBackground}) center / cover no-repeat, #E1F3E8` } as CSSProperties}
    >
      <header className="absolute flex items-center" style={{ top: u(40), right: u(42), gap: u(32) }}>
        <div className="text-right">
          <p className="font-display font-semibold tabular" style={{ fontSize: u(46), lineHeight: 1.1 }}>{clock}</p>
          <p className="text-text-muted" style={{ fontSize: u(23) }}>{date}</p>
        </div>
      </header>

      {calls.isError && (
        <div role="status" className="absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-danger-bg font-medium text-danger" style={{ top: u(24), padding: `${u(10)} ${u(28)}`, fontSize: u(24) }}>
          Sem conexão. Tentando reconectar…
        </div>
      )}

      <div className="flex" style={{ position: "absolute", top: u(154), bottom: u(36), left: "2.4vw", right: "2.2vw", gap: u(26) }}>
        <section
          aria-live="assertive"
          aria-atomic="true"
          className="relative flex flex-col items-center overflow-hidden text-center"
          style={{ ...card, flex: "890 1 0", minWidth: 0, padding: `${u(80)} ${u(48)} ${u(56)}`, transition: "background-color 600ms", background: flash ? "#E6F8EE" : "#FFF" }}
        >
          <div style={{ height: u(100) }}><BrandLogo className="h-full w-auto object-contain" /></div>
          <AnimatePresence mode="wait" initial={false}>
            {current ? (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", visualDuration: 0.5, bounce: 0.25 }}
                className="flex flex-1 flex-col items-center justify-center"
                style={{ gap: u(10) }}
              >
                <p className="font-display font-semibold uppercase text-text-muted" style={{ fontSize: u(32), letterSpacing: "0.12em" }}>
                  {current.chamadas > 1 ? "Chamando novamente" : "Chamando agora"}
                </p>
                <p className="font-display font-bold tabular" style={{ fontSize: u(230), lineHeight: 1, color: ACCENT, letterSpacing: "-0.01em" }}>{current.codigo}</p>
                {current.preferencial && (
                  <span className="rounded-full bg-warning-bg font-display font-semibold text-warning" style={{ fontSize: u(28), padding: `${u(6)} ${u(24)}` }}>Preferencial</span>
                )}
                {current.pacienteNome && <p className="font-display font-semibold" style={{ fontSize: u(70), lineHeight: 1.1, marginTop: u(10) }}>{current.pacienteNome}</p>}
                <p className="flex items-center font-display font-semibold text-text" style={{ fontSize: u(64), gap: u(16), marginTop: u(24) }}>
                  <Location variant="Bold" style={{ width: u(60), height: u(60), color: ACCENT }} aria-hidden />
                  {current.guicheNome ?? "Dirija-se à recepção"}
                </p>
              </motion.div>
            ) : (
              <motion.div key="vazio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center" style={{ gap: u(16) }}>
                <p className="font-display font-semibold text-text" style={{ fontSize: u(52) }}>Aguardando próxima chamada</p>
                <p className="text-text-muted" style={{ fontSize: u(32) }}>Fique atento: sua senha aparecerá aqui.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="flex flex-col" style={{ flex: "916 1 0", minWidth: 0, gap: u(25) }}>
          <section className="flex min-h-0 flex-1 flex-col" style={{ ...card, padding: `${u(30)} ${u(36)}`, gap: u(10) }}>
            <h2 className="font-display font-semibold" style={{ fontSize: u(34), lineHeight: 1.2 }}>Últimas senhas chamadas</h2>
            {history.length === 0 ? (
              <p className="flex flex-1 items-center justify-center text-text-muted" style={{ fontSize: u(28) }}>As senhas anteriores aparecerão aqui.</p>
            ) : (
              <ul className="flex w-full flex-col">
                {history.map((call) => (
                  <li
                    key={callKey(call)}
                    className="grid items-center border-b border-border last:border-b-0"
                    style={{ gridTemplateColumns: "1fr 1.4fr 1.2fr", height: u(58), fontSize: u(30), gap: u(16) }}
                  >
                    <span className="font-display font-bold tabular" style={{ color: ACCENT }}>{call.codigo}</span>
                    <span className="truncate text-text-muted">{call.pacienteNome ?? call.tipoNome}</span>
                    <span className="truncate text-right font-medium text-text">{call.guicheNome ?? "Recepção"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {/* A peça é 16:9: o quadro segue a proporção para nada ser cortado, e a lista acima fica com o resto. */}
          <section aria-label="Anúncio" className="aspect-video w-full shrink-0 overflow-hidden" style={card}>
            <img src={banner.src} alt={banner.alt} className="h-full w-full object-cover" />
          </section>
        </div>
      </div>
    </main>
  );
}

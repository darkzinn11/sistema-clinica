import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { buildTvCalls } from "@/lib/mock/recepcao";

const CYCLE_MS = 6000;
const HISTORY_LIMIT = 4;

// Medidas em px do quadro do Figma (1920×1080). A escala segue a menor dimensão
// e o quadro estica até preencher a tela; a coluna da direita mantém a largura
// do design para o banner continuar 16:9, e o card principal absorve o excesso.
const FRAME_W = 1920;
const FRAME_H = 1080;

function measureFrame() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Janela ainda sem tamanho (navegador da TV abrindo): evita escala 0 e largura NaN.
  if (!w || !h) return { scale: 1, width: FRAME_W, height: FRAME_H };
  const scale = Math.min(w / FRAME_W, h / FRAME_H);
  return { scale, width: w / scale, height: h / scale };
}

function useFrame() {
  const [frame, setFrame] = useState(measureFrame);
  useEffect(() => {
    const observer = new ResizeObserver(() => setFrame(measureFrame()));
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);
  return frame;
}

const CARD_SHADOW = "shadow-[0_0_24px_rgba(0,0,0,0.12)]";

export default function PainelTv() {
  const calls = useMemo(() => buildTvCalls(60), []);
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useFrame();

  useEffect(() => {
    const clockId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % calls.length);
      setFlash(true);
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setFlash(false), 1200);
    }, CYCLE_MS);
    return () => {
      clearInterval(id);
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, [calls.length]);

  const current = calls[idx];
  const history = Array.from({ length: HISTORY_LIMIT }, (_, k) => calls[(idx - k - 1 + calls.length) % calls.length]);

  const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div
      className="h-screen overflow-hidden bg-cover bg-center text-text"
      style={{ backgroundImage: "url(/illustrations/recepcao/painel-tv-fundo.webp)" }}
    >
      <div
        className="flex flex-col gap-[20.7px] px-[44px] py-[32px]"
        style={{ zoom: frame.scale, width: frame.width, height: frame.height }}
      >
        <div className="flex flex-col items-end">
          <p className="font-display text-[51.5px] font-semibold leading-[61.8px] tabular">{clock}</p>
          <p className="text-[24px] capitalize leading-[34.4px] text-text-muted">{dateLabel}</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_916px] gap-[23.7px]">
          <div
            key={current.id}
            className={`flex flex-col items-center justify-center gap-[83px] rounded-[32px] bg-surface-raised px-[39.5px] text-center ${CARD_SHADOW} transition-colors duration-500 motion-reduce:transition-none ${
              flash ? "motion-safe:bg-accent-muted" : ""
            }`}
          >
            <BrandLogo className="h-[112px] w-auto shrink-0" />
            <div className="flex flex-col items-center">
              <p className="text-[44.4px] leading-[83.3px] text-text-muted">Chamando agora</p>
              <p className="font-display text-[197px] font-semibold leading-[197px] tracking-[-0.025em] text-[var(--c-accent)]">{current.code}</p>
              <p className="font-display text-[88.8px] font-semibold leading-[98px]">{current.patientFirstName}</p>
              <p className="text-[44.4px] leading-[83.3px] text-text-muted">{current.place}</p>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-[23.7px]">
            <div className={`flex min-h-0 flex-1 flex-col gap-[11.8px] rounded-[32px] bg-surface-raised p-[31.6px] ${CARD_SHADOW}`}>
              <p className="font-display text-[39.5px] font-semibold leading-[57.2px]">Últimas senhas chamadas</p>
              <ul className="flex flex-col gap-[11.8px]">
                {history.map((c) => (
                  <li key={c.id} className="grid grid-cols-3 items-center gap-4 border-b border-border pb-[4.6px] pt-[3.9px] text-[31.6px] leading-[38px]">
                    <span className="font-medium">{c.code}</span>
                    <span className="truncate text-center text-text-muted">{c.patientFirstName}</span>
                    <span className="truncate text-right text-text-subtle">{c.place}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Peça institucional fictícia: demonstra a área de publicidade do painel (slide 16:9). */}
            <section
              aria-label="Anúncio demonstrativo da MultiSaúde — campanha Outubro Rosa"
              className={`aspect-video shrink-0 overflow-hidden rounded-[49.3px] ${CARD_SHADOW}`}
            >
              <img
                src="/ads/outubro-rosa-slide.webp"
                alt="Combo Outubro Rosa — cuidados essenciais para a saúde da mulher, 4x de R$ 90,00. Mais informações com nossos recepcionistas."
                className="size-full object-cover"
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

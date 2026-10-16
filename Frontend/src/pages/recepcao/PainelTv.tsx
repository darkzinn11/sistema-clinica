import { Call, HeartTick, Location, TickCircle } from "iconsax-reactjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { buildTvCalls } from "@/lib/mock/recepcao";

const CYCLE_MS = 6000;

export default function PainelTv() {
  const calls = useMemo(() => buildTvCalls(60), []);
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const last5 = Array.from({ length: 5 }, (_, k) => calls[(idx - k - 1 + calls.length) % calls.length]);

  const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-bg p-8 text-text">
      <header className="flex min-h-20 items-center justify-between gap-5">
        <BrandLogo className="h-16 w-auto max-w-[55vw] shrink-0 object-contain" />
        <div className="text-right">
          <p className="font-display text-3xl font-semibold tabular">{clock}</p>
          <p className="text-base capitalize text-text-muted">{dateLabel}</p>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div
          key={current.id}
          className={`flex flex-col items-center justify-center gap-6 rounded-xl bg-surface-raised p-10 text-center shadow-pop transition-colors duration-500 motion-reduce:transition-none ${
            flash ? "motion-safe:bg-accent-muted" : ""
          }`}
        >
          <p className="text-xl font-medium uppercase tracking-wide text-text-muted">Chamando agora</p>
          <p className="font-display text-[6rem] font-semibold leading-none tracking-tight text-accent sm:text-[8rem]">{current.code}</p>
          <p className="font-display text-4xl font-semibold">{current.patientFirstName}</p>
          <p className="flex items-center gap-2 text-2xl text-text-muted">
            <Location size={26} aria-hidden />
            {current.place}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl bg-surface-raised p-5 shadow-card">
            <p className="mb-3 flex items-center gap-2 text-base font-semibold text-text-muted">
              <Call size={18} aria-hidden />
              Últimas chamadas
            </p>
            <ul className="flex flex-col divide-y divide-border">
              {last5.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-lg">
                  <span className="font-medium text-text">{c.code}</span>
                  <span className="truncate text-text-muted">{c.patientFirstName}</span>
                  <span className="shrink-0 text-text-subtle">{c.place}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Peça institucional fictícia: demonstra a área de publicidade do painel. */}
          <section
            aria-label="Anúncio demonstrativo da MultiSaúde"
            className="relative isolate flex min-h-[320px] flex-1 overflow-hidden rounded-xl bg-[linear-gradient(125deg,#0E503C_0%,#168552_58%,#35B64B_100%)] p-7 text-white shadow-card sm:p-8"
          >
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10 flex w-full max-w-[75%] flex-col items-start justify-between gap-5">
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/90">
                Anúncio fictício
              </span>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#CAFFD9]">
                  Clínica Popular MultiSaúde
                </p>
                <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[34px]">
                  Seu cuidado começa aqui.
                </h2>
                <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-white/85">
                  Consultas, exames e atenção à sua saúde em cada etapa da vida.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-[#167A3D]">
                <TickCircle size={17} variant="Bold" aria-hidden />
                Prevenção e bem-estar
              </div>
            </div>
            <div aria-hidden className="pointer-events-none absolute -bottom-7 -right-8 flex h-48 w-48 items-center justify-center rounded-full border border-white/20 bg-white/15 shadow-[inset_0_0_0_17px_rgba(255,255,255,0.05)] backdrop-blur-[2px] sm:bottom-2 sm:right-0 sm:h-52 sm:w-52">
              <HeartTick size={89} variant="Bold" className="text-white/90" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

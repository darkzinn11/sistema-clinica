import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import chamadorBackground from "@/assets/chamador.svg";
import { BrandLogo } from "@/components/shell/brand-logo";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { usePanelCalls } from "@/lib/api/painel";
import { clearDevice, loadDevice } from "@/lib/device/storage";

/** Unidade proporcional ao frame do Figma (1920×1080): a tela inteira escala junto com a TV. */
const u = (n: number) => `calc(var(--u) * ${n})`;

/** Propaganda da TV: qualquer imagem `src/assets/banner-tv.*` aparece no quadro de baixo; sem imagem, o quadro não existe. */
const banners = import.meta.glob("../../assets/banner-tv.{png,jpg,jpeg,webp,svg}", { eager: true, import: "default" }) as Record<string, string>;
const bannerSrc = Object.values(banners)[0];

const card: CSSProperties = { background: "#FFF", borderRadius: u(44), boxShadow: "0 0 24px 0 rgba(0, 0, 0, 0.12)" };

export default function PainelTv() {
  const [device, setDevice] = useState(() => loadDevice("painel"));
  const [now, setNow] = useState(() => new Date());
  const [flash, setFlash] = useState(false);
  const previousCode = useRef<string | null>(null);
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

  // Código novo na tela: o cartão pisca por um instante para chamar a atenção de quem está na sala.
  useEffect(() => {
    const code = calls.data?.atual?.codigo ?? null;
    if (code && previousCode.current && code !== previousCode.current) {
      setFlash(true);
      const id = window.setTimeout(() => setFlash(false), 1200);
      previousCode.current = code;
      return () => window.clearTimeout(id);
    }
    previousCode.current = code;
    return undefined;
  }, [calls.data?.atual?.codigo]);

  if (!device) return <PareamentoDispositivo tipo="painel" testPath="/painel/chamadas" onPaired={setDevice} />;

  const data = calls.data;
  const current = data?.atual ?? null;
  const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/(^|[ ,-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden text-text"
      style={{ "--u": "min(calc(100vw / 1920), calc(100vh / 1080))", background: `url(${chamadorBackground}) center / cover no-repeat, #DDEEE3` } as CSSProperties}
    >
      <header className="absolute text-right" style={{ top: u(40), right: u(42) }}>
        <p className="font-display font-semibold tabular" style={{ fontSize: u(46), lineHeight: 1.1 }}>{clock}</p>
        <p className="text-text-muted" style={{ fontSize: u(23) }}>{date}</p>
      </header>

      {calls.isError && (
        <div role="status" className="absolute left-1/2 z-10 -translate-x-1/2 rounded-lg bg-danger-muted px-4 py-2 text-danger" style={{ top: u(20), fontSize: u(26) }}>
          Painel offline. Tentando reconectar…
        </div>
      )}

      <div className="flex" style={{ position: "absolute", top: u(154), bottom: u(36), left: "2.4vw", right: "2.2vw", gap: u(26) }}>
        <section
          className="flex flex-col items-center text-center transition-colors"
          style={{ ...card, background: flash ? "#E6F4EA" : "#FFF", flex: "890 1 0", minWidth: 0, padding: `${u(111)} ${u(40)} ${u(40)}` }}
        >
          <div style={{ height: u(115) }}><BrandLogo className="h-full w-auto object-contain" /></div>
          {current ? (
            <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: u(12) }}>
              <p className="text-text-muted" style={{ fontSize: u(40) }}>Chamando agora</p>
              <p className="font-display font-bold tabular" style={{ fontSize: u(192), lineHeight: 1, color: "#3AB04B", letterSpacing: "-0.01em" }}>{current.codigo}</p>
              {current.pacienteNome && <p className="font-display font-semibold" style={{ fontSize: u(76), lineHeight: 1.1, marginTop: u(14) }}>{current.pacienteNome}</p>}
              <p className="text-text-muted" style={{ fontSize: u(36) }}>{current.guicheNome ?? "Aguarde no painel"}</p>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-text-muted" style={{ fontSize: u(46) }}>Aguardando próxima chamada</p>
            </div>
          )}
        </section>

        <div className="flex flex-col" style={{ flex: "916 1 0", minWidth: 0, gap: u(25) }}>
          <section className="flex flex-col items-start" style={{ ...card, flex: "none", width: "100%", height: u(356), padding: u(31.579), gap: u(11.842) }}>
            <h2 className="font-display font-semibold" style={{ fontSize: u(34), lineHeight: 1.2 }}>Últimas senhas chamadas</h2>
            <ul className="flex w-full flex-col" style={{ gap: u(11.842) }}>
              {(data?.ultimas ?? []).slice(0, 4).map((call) => (
                <li
                  key={`${call.codigo}-${call.ultimaChamadaEm}`}
                  className="flex items-center justify-between border-b border-border"
                  style={{ height: u(45), fontSize: u(27) }}
                >
                  <span className="font-medium">{call.codigo}</span>
                  <span className="text-text-muted">{call.pacienteNome ?? call.tipoNome}</span>
                  <span className="text-text-muted">{call.guicheNome ?? "—"}</span>
                </li>
              ))}
            </ul>
          </section>
          {bannerSrc && (
            <section className="min-h-0 flex-1 overflow-hidden" style={card}>
              <img src={bannerSrc} alt="" className="h-full w-full object-cover" />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

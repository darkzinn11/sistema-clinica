import { Call, Location } from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { usePanelCalls } from "@/lib/api/painel";
import { clearDevice, loadDevice } from "@/lib/device/storage";

export default function PainelTv() {
  const [device, setDevice] = useState(() => loadDevice("painel"));
  const [now, setNow] = useState(() => new Date());
  const [flash, setFlash] = useState(false);
  const previousCode = useRef<string | null>(null);
  const calls = usePanelCalls(device?.token ?? null);
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { if ((calls.error as Error & { status?: number } | null)?.status === 401) { clearDevice("painel"); setDevice(null); } }, [calls.error]);
  useEffect(() => { const code = calls.data?.atual?.codigo ?? null; if (code && previousCode.current && code !== previousCode.current) { setFlash(true); const id = window.setTimeout(() => setFlash(false), 1200); previousCode.current = code; return () => window.clearTimeout(id); } previousCode.current = code; return undefined; }, [calls.data?.atual?.codigo]);
  if (!device) return <PareamentoDispositivo tipo="painel" testPath="/painel/chamadas" onPaired={setDevice} />;
  const data = calls.data; const clock = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return <div className="flex min-h-screen flex-col gap-6 bg-bg p-8 text-text">
    <header className="flex min-h-20 items-center justify-between gap-5"><BrandLogo className="h-16 w-auto max-w-[55vw] shrink-0 object-contain" /><div className="text-right"><p className="font-display text-3xl font-semibold tabular">{clock}</p><p className="text-base capitalize text-text-muted">{dateLabel}</p></div></header>
    {calls.isError && <div role="status" className="rounded-lg bg-danger-muted px-4 py-3 text-center text-danger">Painel offline. Tentando reconectar…</div>}
    <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]"><div className={`flex flex-col items-center justify-center gap-6 rounded-xl bg-surface-raised p-10 text-center shadow-pop transition-colors ${flash ? "bg-accent-muted" : ""}`}><p className="text-xl font-medium uppercase tracking-wide text-text-muted">Chamando agora</p>{data?.atual ? <><p className="font-display text-[6rem] font-semibold leading-none tracking-tight text-accent sm:text-[8rem]">{data.atual.codigo}</p><p className="flex items-center gap-2 text-2xl text-text-muted"><Location size={26} aria-hidden />{data.atual.guicheNome ?? "Aguarde no painel"}</p></> : <p className="text-2xl text-text-muted">Aguardando próxima chamada</p>}</div><div className="rounded-xl bg-surface-raised p-5 shadow-card"><p className="mb-3 flex items-center gap-2 text-base font-semibold text-text-muted"><Call size={18} aria-hidden />Últimas chamadas</p><ul className="flex flex-col divide-y divide-border">{(data?.ultimas ?? []).map((call) => <li key={`${call.codigo}-${call.ultimaChamadaEm}`} className="flex items-center justify-between gap-3 py-3 text-lg"><span className="font-medium">{call.codigo}</span><span className="text-text-muted">{call.tipoNome}</span><span className="text-text-subtle">{call.guicheNome ?? "—"}</span></li>)}</ul></div></div>
  </div>;
}

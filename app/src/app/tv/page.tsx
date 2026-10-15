import { getCurrentCallAction } from "@/lib/actions";
import { TvBoard } from "@/components/app/tv-board";

/**
 * Painel público pra rodar numa TV da recepção, sem login. Ver S18 (idle)
 * e S19 (chamando) em replica/recon.md.
 */
export default async function TvPage() {
  const initial = await getCurrentCallAction();
  return <TvBoard initial={initial} />;
}

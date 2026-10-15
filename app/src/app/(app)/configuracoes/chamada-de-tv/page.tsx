import Link from "next/link";
import * as store from "@/lib/data/store";
import { TvBoardConfigForm } from "@/components/app/tv-board-config-form";

export default async function ChamadaDeTvPage() {
  const config = await store.getTvBoardConfig();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Chamada de TV</h1>
        <p className="text-base text-text-muted">
          Aparência do painel público que fica numa TV da recepção.{" "}
          <Link href="/tv" target="_blank" className="text-accent underline">
            Abrir o painel →
          </Link>
        </p>
      </div>
      <TvBoardConfigForm config={config} />
    </div>
  );
}

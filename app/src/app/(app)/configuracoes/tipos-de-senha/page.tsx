import * as store from "@/lib/data/store";
import { TicketTypeEditor } from "@/components/app/ticket-type-editor";

export default async function TiposDeSenhaPage() {
  const ticketTypes = await store.getTicketTypes();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Tipos de Senha</h1>
        <p className="text-base text-text-muted">
          Cada tipo vira um botão no totem. A sigla + número formam o código
          da senha (ex.: CON3).
        </p>
      </div>
      <TicketTypeEditor ticketTypes={ticketTypes} />
    </div>
  );
}

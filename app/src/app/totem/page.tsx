import * as store from "@/lib/data/store";
import { TotemKiosk } from "@/components/app/totem-kiosk";

/**
 * Tela pública, sem login — pensada pra rodar num tablet fixo na recepção.
 * Ver S18 em replica/recon.md.
 */
export default async function TotemPage() {
  const ticketTypes = await store.getActiveTicketTypesPublic();
  return <TotemKiosk ticketTypes={ticketTypes} />;
}

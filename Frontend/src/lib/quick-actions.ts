import { CalendarAdd, NoteAdd, ReceiptAdd, UserAdd, VolumeHigh } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";

/** Ações "criar novo" — botão Novo da barra superior e topo da busca ⌘K. */
export const QUICK_ACTIONS: { label: string; href: string; icon: IconType; keywords: string }[] = [
  { label: "Novo agendamento", href: "/agenda?novo=1", icon: CalendarAdd, keywords: "marcar consulta agendar encaixe" },
  { label: "Novo paciente", href: "/pacientes/novo", icon: UserAdd, keywords: "cadastrar inserir" },
  { label: "Novo lançamento financeiro", href: "/financeiro/receber?novo=1", icon: ReceiptAdd, keywords: "receita despesa conta" },
  { label: "Nova guia TISS", href: "/faturamento/guias/nova", icon: NoteAdd, keywords: "convênio sp/sadt consulta" },
  { label: "Chamar próxima senha", href: "/senhas", icon: VolumeHigh, keywords: "guichê fila" },
];

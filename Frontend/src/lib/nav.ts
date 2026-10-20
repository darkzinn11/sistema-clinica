import { Box, Calendar, Category, Chart2, ClipboardText, DocumentText, Health, Home2, People, Reserve, Setting2, Wallet2 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";

export interface NavLink {
  label: string;
  href: string;
  /** Abre fora do shell (painel de TV, totem — telas públicas de tela cheia). */
  external?: boolean;
  /** Termos extras pra busca ⌘K. */
  keywords?: string;
}

export interface NavItem extends NavLink {
  icon: IconType;
  children?: NavLink[];
  /** Filhos não aparecem na sidebar (a própria página tem subnavegação). */
  childrenInPage?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Início", href: "/inicio", icon: Home2, keywords: "dashboard painel resumo" },
      {
        label: "Agenda",
        href: "/agenda",
        icon: Calendar,
        children: [
          { label: "Dia", href: "/agenda", keywords: "diária múltipla profissionais" },
          { label: "Semana", href: "/agenda/semana", keywords: "semanal" },
          { label: "Por sala", href: "/agenda/salas", keywords: "locais múltipla por locais" },
          { label: "Mapa de ocupação", href: "/agenda/mapa", keywords: "mapa de agenda taxa" },
          { label: "Check-in", href: "/agenda/check-in", keywords: "chegada recepção" },
          { label: "Confirmações", href: "/agenda/confirmacoes", keywords: "confirmar whatsapp" },
          { label: "Equipamentos", href: "/agenda/equipamentos", keywords: "equipamentos alocados" },
          { label: "Consultar valores", href: "/agenda/valores", keywords: "preço procedimento" },
        ],
      },
      {
        label: "Recepção",
        href: "/espera",
        icon: Reserve,
        children: [
          { label: "Sala de espera", href: "/espera", keywords: "fila espera" },
          { label: "Chamar senha", href: "/senhas", keywords: "guichê senha fila" },
          { label: "Painel de TV", href: "/tv", external: true, keywords: "chamada tv" },
          { label: "Totem", href: "/totem", external: true, keywords: "autoatendimento senha" },
        ],
      },
      {
        label: "Atendimento",
        href: "/atendimento",
        icon: Health,
        keywords: "consulta médico prontuário evolução",
      },
      {
        label: "Pacientes",
        href: "/pacientes",
        icon: People,
        children: [
          { label: "Todos os pacientes", href: "/pacientes", keywords: "listar buscar" },
          { label: "Novo paciente", href: "/pacientes/novo", keywords: "inserir cadastrar" },
        ],
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        label: "Financeiro",
        href: "/financeiro",
        icon: Wallet2,
        children: [
          { label: "Visão geral", href: "/financeiro", keywords: "resumo" },
          { label: "Contas a receber", href: "/financeiro/receber", keywords: "receitas" },
          { label: "Contas a pagar", href: "/financeiro/pagar", keywords: "despesas" },
          { label: "Recorrentes", href: "/financeiro/recorrentes", keywords: "despesas fixas receitas fixas" },
          { label: "Caixa", href: "/financeiro/caixa", keywords: "abrir fechar caixa cofre recepção" },
          { label: "Extratos e conciliação", href: "/financeiro/extratos", keywords: "banco conta corrente" },
          { label: "Repasses", href: "/financeiro/repasses", keywords: "repasse médico consolidação" },
          { label: "Notas fiscais", href: "/financeiro/notas-fiscais", keywords: "nfs-e nota" },
          { label: "Cartões e cheques", href: "/financeiro/cartoes", keywords: "tef maquininha cheque" },
          { label: "Propostas", href: "/financeiro/propostas", keywords: "orçamento" },
        ],
      },
      {
        label: "Faturamento TISS",
        href: "/faturamento",
        icon: DocumentText,
        children: [
          { label: "Visão geral", href: "/faturamento", keywords: "convênio" },
          { label: "Guias", href: "/faturamento/guias", keywords: "buscar guias" },
          { label: "Nova guia", href: "/faturamento/guias/nova", keywords: "consulta sp/sadt honorários internação quimioterapia" },
          { label: "Lotes", href: "/faturamento/lotes", keywords: "fechar validar conferência" },
          { label: "Retorno e glosas", href: "/faturamento/retorno", keywords: "xml baixa glosa" },
          { label: "Autorizações", href: "/faturamento/autorizacoes", keywords: "autorizador online" },
          { label: "Tabela de valores", href: "/faturamento/valores", keywords: "valores de itens validação" },
        ],
      },
      {
        label: "Estoque",
        href: "/estoque",
        icon: Box,
        children: [
          { label: "Posição do estoque", href: "/estoque", keywords: "saldo" },
          { label: "Produtos", href: "/estoque/produtos", keywords: "inserir listar" },
          { label: "Movimentações", href: "/estoque/movimentacoes", keywords: "entrada saída" },
          { label: "Kits", href: "/estoque/kits", keywords: "kits de produtos" },
          { label: "Requisições", href: "/estoque/requisicoes", keywords: "requisição de estoque" },
        ],
      },
      { label: "Relatórios", href: "/relatorios", icon: Chart2, keywords: "relatório produção caixa dre" },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        label: "Cadastros",
        href: "/cadastros",
        icon: Category,
        childrenInPage: true,
        children: [
          { label: "Profissionais", href: "/cadastros/profissionais", keywords: "médicos horários" },
          { label: "Profissionais externos", href: "/cadastros/profissionais-externos", keywords: "médicos solicitantes encaminhamento" },
          { label: "Grupos de profissionais", href: "/cadastros/grupos-de-profissionais" },
          { label: "Especialidades", href: "/cadastros/especialidades", keywords: "cbo" },
          { label: "Procedimentos", href: "/cadastros/procedimentos", keywords: "exames serviços" },
          { label: "Convênios", href: "/cadastros/convenios", keywords: "planos operadoras" },
          { label: "Exames (laboratório)", href: "/cadastros/exames-laboratorio", keywords: "lab código amostra" },
          { label: "Funcionários e usuários", href: "/cadastros/funcionarios", keywords: "permissões acesso" },
          { label: "Locais e salas", href: "/cadastros/locais", keywords: "locais de atendimento consultório" },
          { label: "Equipamentos", href: "/cadastros/equipamentos" },
          { label: "Fornecedores", href: "/cadastros/fornecedores" },
          { label: "Contatos", href: "/cadastros/contatos" },
          { label: "Tabelas de preço", href: "/cadastros/tabelas-de-preco", keywords: "tabelas particulares" },
          { label: "Variações de preço", href: "/cadastros/variacoes-de-preco", keywords: "acréscimo desconto" },
          { label: "Cartões de benefício", href: "/cadastros/cartoes-de-beneficio", keywords: "convênio de desconto" },
          { label: "Formas de recebimento", href: "/cadastros/formas-de-recebimento" },
          { label: "Plano de contas", href: "/cadastros/plano-de-contas" },
          { label: "Centros de custo", href: "/cadastros/centros-de-custo" },
          { label: "Contas correntes", href: "/cadastros/contas-correntes", keywords: "banco" },
          { label: "Regras de repasse", href: "/cadastros/regras-de-repasse" },
          { label: "Origens de pacientes", href: "/cadastros/origens", keywords: "como conheceu" },
          { label: "Feriados", href: "/cadastros/feriados" },
          { label: "Modelos e impressos", href: "/cadastros/modelos", keywords: "formulários impressos laudos atestados" },
          { label: "Vouchers", href: "/cadastros/vouchers", keywords: "cupom desconto" },
          { label: "Dados da empresa", href: "/cadastros/empresa", keywords: "cnpj unidade" },
        ],
      },
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: Setting2,
        childrenInPage: true,
        children: [
          { label: "Gerais", href: "/configuracoes/gerais" },
          { label: "Agendamento online", href: "/configuracoes/agendamento-online", keywords: "link público" },
          { label: "Área do paciente", href: "/configuracoes/area-do-paciente", keywords: "portal" },
          { label: "Campos obrigatórios", href: "/configuracoes/campos-obrigatorios" },
          { label: "Faixas etárias", href: "/configuracoes/faixas-etarias" },
          { label: "Triagem", href: "/configuracoes/triagem", keywords: "classificação de risco" },
          { label: "Totem e guichês", href: "/configuracoes/totem-e-guiches", keywords: "tipos de senha guichê" },
          { label: "Chamada de TV", href: "/configuracoes/chamada-de-tv", keywords: "painel voz" },
          { label: "Integrações", href: "/configuracoes/integracoes", keywords: "api pacs laboratório ia whatsapp" },
          { label: "Privacidade e acesso", href: "/configuracoes/privacidade", keywords: "lgpd omissão de dados locais de acesso" },
          { label: "Usuários conectados", href: "/configuracoes/usuarios-conectados", keywords: "sessões" },
          { label: "Compras", href: "/configuracoes/compras", keywords: "configuração de compra" },
        ],
      },
    ],
  },
];

export const ACCOUNT_LINKS: NavLink[] = [
  { label: "Meu perfil", href: "/perfil" },
  { label: "Notificações", href: "/notificacoes" },
  { label: "Arquivos", href: "/arquivos" },
  { label: "Registro de atividades", href: "/logs", keywords: "logs de ações auditoria" },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

/** Lista achatada pra busca ⌘K, com o caminho (ex.: "Financeiro › Caixa"). */
export function searchableLinks(): (NavLink & { trail: string; icon: IconType })[] {
  const out: (NavLink & { trail: string; icon: IconType })[] = [];
  for (const item of ALL_ITEMS) {
    out.push({ ...item, trail: item.label });
    for (const child of item.children ?? []) {
      if (child.href === item.href) continue;
      out.push({ ...child, trail: `${item.label} › ${child.label}`, icon: item.icon });
    }
  }
  for (const link of ACCOUNT_LINKS) out.push({ ...link, trail: `Conta › ${link.label}`, icon: ClipboardText });
  return out;
}

/** Item de topo dono de um caminho — o mais específico ganha. */
export function findSection(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of ALL_ITEMS) {
    const candidates = [item.href, ...(item.children ?? []).map((c) => c.href)];
    if (candidates.some((h) => pathname === h || pathname.startsWith(`${h}/`))) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}

/** Link filho que melhor casa com o caminho (pra destacar na sidebar). */
export function findActiveChild(item: NavItem, pathname: string): NavLink | undefined {
  const matches = (item.children ?? []).filter((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

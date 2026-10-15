import type { Cid10 } from "@/lib/mock/atendimento";

export interface EvolucaoState {
  queixaPrincipal: string;
  hda: string;
  exameFisico: string;
  cids: Cid10[];
  conduta: string;
}

export const EMPTY_EVOLUCAO: EvolucaoState = { queixaPrincipal: "", hda: "", exameFisico: "", cids: [], conduta: "" };

export interface PrescricaoItem {
  id: string;
  medicamentoId: string;
  posologia: string;
  quantidade: string;
  via: string;
}

export interface ExameItem {
  tuss: string;
}

export interface DocumentoGerado {
  id: string;
  templateId: string;
  label: string;
  content: string;
}

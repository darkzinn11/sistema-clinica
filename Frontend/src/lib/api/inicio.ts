import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export interface InicioProximo {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  pacienteId: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  profissionalCor: string | null;
  procedimentoNome: string;
}

export interface InicioEspera {
  agendamentoId: string;
  pacienteId: string;
  pacienteNome: string;
  profissionalNome: string;
  aguardandoMin: number;
}

export interface InicioOcupacao {
  profissionalId: string;
  nome: string;
  cor: string | null;
  blocos: number;
  ocupados: number;
  ocupacaoPct: number;
}

export interface InicioAniversariante {
  pacienteId: string;
  nome: string;
  dia: string;
  idade: number;
}

export interface InicioResumo {
  data: string;
  agendamentosHoje: number;
  agendamentosOntem: number;
  confirmados: number;
  taxaConfirmacaoPct: number;
  naSalaDeEspera: number;
  faturamentoPrevistoCentavos: number | null;
  faturamentoOntemCentavos: number | null;
  semConfirmacaoAmanha: number;
  proximos: InicioProximo[];
  espera: InicioEspera[];
  ocupacao: InicioOcupacao[];
  aniversariantes: InicioAniversariante[];
}

/** A recepção deixa o Início aberto o dia todo: atualiza sozinho a cada 30 s. */
export function useInicio() {
  return useQuery({ queryKey: ["inicio"], queryFn: () => api<InicioResumo>("/inicio"), refetchInterval: 30_000 });
}

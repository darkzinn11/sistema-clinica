import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiGrades, useApiProcedures, useApiProfessionals } from "@/lib/api/agenda";
import { useAuth } from "@/lib/auth/auth";
import { buildProcedures, buildProfessionals, type AgendaProcedure, type AgendaProfessional } from "./model";

interface AgendaCatalog {
  unitId: string;
  professionals: AgendaProfessional[];
  procedures: AgendaProcedure[];
  professionalById: (id: string) => AgendaProfessional | undefined;
  procedureById: (id: string) => AgendaProcedure | undefined;
}

const Context = createContext<AgendaCatalog | null>(null);

/** Carrega profissionais, grades e procedimentos uma vez e só então mostra a tela da agenda. */
export function AgendaCatalogProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const professionals = useApiProfessionals();
  const procedures = useApiProcedures();
  const grades = useApiGrades();
  const unitId = session?.usuario.unidadeId ?? "";

  const catalog = useMemo<AgendaCatalog | null>(() => {
    if (!professionals.data || !procedures.data || !grades.data) return null;
    const list = buildProfessionals(professionals.data, grades.data, unitId);
    const procs = buildProcedures(procedures.data);
    return {
      unitId, professionals: list, procedures: procs,
      professionalById: (id) => list.find((p) => p.id === id),
      procedureById: (id) => procs.find((p) => p.id === id),
    };
  }, [professionals.data, procedures.data, grades.data, unitId]);

  const failed = professionals.error ?? procedures.error ?? grades.error;
  if (failed) {
    return <EmptyState title="Não foi possível carregar a agenda." description={failed.message} illustration="agenda/nenhum-agendamento" />;
  }
  if (!catalog) {
    return (
      <div className="mx-auto flex max-w-[1780px] flex-col gap-4" aria-busy="true" aria-label="Carregando a agenda">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  return <Context.Provider value={catalog}>{children}</Context.Provider>;
}

export function useCatalog(): AgendaCatalog {
  const value = useContext(Context);
  if (!value) throw new Error("useCatalog fora do AgendaCatalogProvider");
  return value;
}

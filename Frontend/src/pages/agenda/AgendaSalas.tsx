import { useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";

type ViewMode = "dia" | "semana" | "salas";

/**
 * A agenda por sala depende do cadastro de salas e equipamentos, que ainda não existe no sistema.
 * Em vez de mostrar dados de demonstração misturados com a agenda real, a tela avisa.
 */
export default function Page() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Agenda por sala"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Por sala" }]}
        description="A mesma agenda do dia, organizada pelos locais de atendimento."
        actions={
          <Segmented<ViewMode>
            label="Visualização"
            value="salas"
            onChange={(v) => {
              if (v === "dia") navigate("/agenda");
              if (v === "semana") navigate("/agenda/semana");
            }}
            options={[
              { value: "dia", label: "Dia" },
              { value: "semana", label: "Semana" },
              { value: "salas", label: "Por sala" },
            ]}
          />
        }
      />
      <Card>
        <EmptyState
          title="A agenda por sala ainda não está disponível"
          description="Ela depende do cadastro de salas e equipamentos, que será ligado em uma próxima etapa. Use a agenda do dia ou da semana."
          illustration="agenda/nenhum-agendamento"
        />
      </Card>
    </div>
  );
}

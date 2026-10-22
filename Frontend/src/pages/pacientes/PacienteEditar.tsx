import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { PacienteForm } from "@/components/pacientes/PacienteForm";
import { ApiError } from "@/lib/api/client";
import { usePatient, useSavePatient } from "@/lib/api/pacientes";

export default function Page() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const patient = usePatient(id);
  const save = useSavePatient();
  const [error, setError] = useState<string | null>(null);

  if (patient.isPending) return <div className="mx-auto max-w-5xl"><Skeleton className="h-96 w-full" /></div>;
  if (patient.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Paciente não encontrado" description="O cadastro pode ter sido removido ou o link está incorreto."
          action={<ButtonLink to="/pacientes" variant="primary">Voltar para a lista de pacientes</ButtonLink>} />
      </div>
    );
  }
  const p = patient.data;
  if (!p.ativo) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Paciente inativo" description="Reative o cadastro para poder editá-lo." action={<ButtonLink to={`/pacientes/${id}`} variant="primary">Abrir o cadastro</ButtonLink>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Editar ${p.nome}`}
        breadcrumbs={[{ label: "Início", href: "/inicio" }, { label: "Pacientes", href: "/pacientes" }, { label: p.nome, href: `/pacientes/${id}` }, { label: "Editar" }]}
      />
      <PacienteForm
        initial={p}
        submitting={save.isPending}
        error={error}
        submitLabel="Salvar alterações"
        onCancel={() => navigate(`/pacientes/${id}`)}
        onSubmit={(form) => {
          setError(null);
          save.mutateAsync({ id, form })
            .then(() => navigate(`/pacientes/${id}`))
            .catch((e) => setError(e instanceof ApiError ? (e.status === 409 ? "Já existe outro paciente com este CPF nesta clínica." : e.message) : "Não foi possível salvar. Tente de novo."));
        }}
      />
    </div>
  );
}

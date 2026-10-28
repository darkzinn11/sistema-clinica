import { useState } from "react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/ui/page-header";
import { PacienteForm } from "@/components/pacientes/PacienteForm";
import { ApiError } from "@/lib/api/client";
import { useSavePatient } from "@/lib/api/pacientes";

export default function Page() {
  const navigate = useNavigate();
  const save = useSavePatient();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        card
        title="Novo paciente"
        breadcrumbs={[{ label: "Pacientes", href: "/pacientes" }, { label: "Novo paciente" }]}
        description="Cadastro completo. O número do prontuário é gerado pelo sistema ao salvar."
      />
      <PacienteForm
        submitting={save.isPending}
        error={error}
        submitLabel="Cadastrar paciente"
        onCancel={() => navigate("/pacientes")}
        onSubmit={(form) => {
          setError(null);
          save.mutateAsync({ form })
            .then((created) => navigate(`/pacientes/${created.id}`))
            .catch((e) => setError(e instanceof ApiError ? (e.status === 409 ? "Já existe um paciente com este CPF nesta clínica." : e.message) : "Não foi possível salvar. Tente de novo."));
        }}
      />
    </div>
  );
}

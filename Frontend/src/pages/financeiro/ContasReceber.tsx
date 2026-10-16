import { PageHeader } from "@/components/ui/page-header";
import { ContasLista } from "@/components/financeiro/ContasLista";

export default function ContasReceber() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Contas a receber"
        description="Acompanhe lançamentos a receber de pacientes e convênios, baixe pagamentos e controle vencimentos."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Contas a receber" }]}
      />
      <ContasLista tipo="receita" />
    </div>
  );
}

import { PageHeader } from "@/components/ui/page-header";
import { ContasLista } from "@/components/financeiro/ContasLista";

export default function ContasPagar() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Contas a pagar"
        description="Acompanhe lançamentos a pagar a fornecedores e prestadores, baixe pagamentos e controle vencimentos."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Contas a pagar" }]}
      />
      <ContasLista tipo="despesa" />
    </div>
  );
}

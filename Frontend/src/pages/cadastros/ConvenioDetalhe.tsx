import { useParams } from "react-router";
import { InfoCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LiquidTabs from "@/components/pinui/LiquidTabs";
import { DescriptionList, FormSection } from "@/components/ui/misc";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { brl } from "@/lib/format";
import { insurances, procedures } from "@/lib/mock/core";
import { insuranceBilling, insurancePlans, procedurePricesByInsurance } from "@/lib/mock/cadastros";

export default function ConvenioDetalhe() {
  const { id = "" } = useParams();
  const ins = insurances.find((i) => i.id === id);

  if (!ins) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader card title="Convênio" breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Convênios", href: "/cadastros/convenios" }, { label: "Não encontrado" }]} />
        <Card>
          <EmptyState title="Convênio não encontrado" description="Verifique o link ou volte para a lista de convênios." />
        </Card>
      </div>
    );
  }

  const billing = insuranceBilling(ins.id);
  const plans = insurancePlans(ins.id);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        card
        title={ins.name}
        description={`Registro ANS ${ins.ans}`}
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Convênios", href: "/cadastros/convenios" }, { label: ins.name }]}
        meta={
          <Badge tone={billing.ativo ? "success" : "neutral"} dot>
            {billing.ativo ? "Ativo" : "Inativo"}
          </Badge>
        }
      />

      <LiquidTabs label="Seções do convênio" tabs={[{ label: "Dados" }, { label: "Planos" }, { label: "Tabela de preços" }, { label: "Regras de faturamento" }]}>
        {(active) => {
          if (active === 0) {
            return (
              <FormSection variant="stacked" title="Dados do convênio">
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "Nome", value: ins.name },
                    { label: "Registro ANS", value: ins.ans },
                    { label: "Versão TISS", value: billing.versaoTiss },
                    { label: "Prazo de pagamento", value: `${billing.prazoPagamentoDias} dias` },
                  ]}
                />
              </FormSection>
            );
          }
          if (active === 1) {
            return (
              <FormSection variant="stacked" title="Planos" description="Planos deste convênio e a tabela de preços vinculada.">
                {plans.length === 0 ? (
                  <EmptyState title="Nenhum plano cadastrado" description="Cadastre ao menos um plano pra liberar o faturamento por este convênio." />
                ) : (
                  <div className="-mx-4">
                    <Table>
                      <THead>
                        <tr>
                          <TH>Plano</TH>
                          <TH>Tabela de preços</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {plans.map((plan) => (
                          <TR key={plan.id}>
                            <TD className="font-medium text-text">{plan.name}</TD>
                            <TD className="text-text-muted">{plan.tabela}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                )}
              </FormSection>
            );
          }
          if (active === 2) {
            return (
              <FormSection variant="stacked" title="Tabela de preços" description="Valores negociados por procedimento.">
                <div className="-mx-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Procedimento</TH>
                        <TH>Especialidade</TH>
                        <TH align="right">Valor particular</TH>
                        <TH align="right">Valor no convênio</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {procedures.map((proc) => {
                        const price = procedurePricesByInsurance(proc.id).find((p) => p.insuranceId === ins.id);
                        return (
                          <TR key={proc.id}>
                            <TD>{proc.name}</TD>
                            <TD className="text-text-muted">{proc.specialty}</TD>
                            <TD numeric className="text-text-muted">{brl(proc.priceCents)}</TD>
                            <TD numeric>{price ? brl(price.priceCents) : "—"}</TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              </FormSection>
            );
          }
          return (
            <div className="flex flex-col">
              <FormSection variant="stacked" title="Prazos">
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "Prazo de envio de guias", value: `${billing.prazoEnvioDias} dias após o atendimento` },
                    { label: "Dia de fechamento do lote", value: `Dia ${billing.diaFechamento} de cada mês` },
                  ]}
                />
              </FormSection>
              <FormSection variant="stacked" title="Procedimentos que exigem autorização prévia">
                {billing.exigeAutorizacao.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-text-muted">
                    <InfoCircle size={16} aria-hidden />
                    Nenhum procedimento deste convênio exige autorização prévia.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {billing.exigeAutorizacao.map((name) => (
                      <li key={name} className="flex items-center gap-2 text-base text-text">
                        <Badge tone="warning" size="sm">Autorização</Badge>
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>
              <FormSection variant="stacked" title="Contato da operadora">
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "Setor", value: billing.contato.nome },
                    { label: "Telefone", value: billing.contato.telefone },
                    { label: "E-mail", value: billing.contato.email },
                  ]}
                />
              </FormSection>
            </div>
          );
        }}
      </LiquidTabs>
    </div>
  );
}

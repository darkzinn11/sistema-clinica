import { SaveAdd } from "iconsax-reactjs";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/ui/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import { CATEGORIAS, FORNECEDORES, MOVIMENTO_TIPO_META, type Categoria, type MovimentoTipo, consumoSemanal, lotesDoProduto, movimentacoesDoProduto, produtoById } from "@/lib/mock/estoque";

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNovo = id === "novo";
  const produto = !isNovo && id ? produtoById(id) : undefined;

  const [nome, setNome] = useState(produto?.nome ?? "");
  const [codigo, setCodigo] = useState(produto?.codigo ?? "");
  const [categoria, setCategoria] = useState<Categoria | "">(produto?.categoria ?? "");
  const [unidade, setUnidade] = useState(produto?.unidade ?? "");
  const [estoqueMinimo, setEstoqueMinimo] = useState(produto ? String(produto.estoqueMinimo) : "");
  const [estoqueMaximo, setEstoqueMaximo] = useState(produto ? String(produto.estoqueMaximo) : "");
  const [fornecedor, setFornecedor] = useState(produto?.fornecedorPreferido ?? "");
  const [saved, setSaved] = useState(false);

  if (!isNovo && id && !produto) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Produto não encontrado" breadcrumbs={[{ label: "Estoque", href: "/estoque" }, { label: "Produtos", href: "/estoque/produtos" }]} />
        <Card>
          <EmptyState title="Produto não encontrado" description="Ele pode ter sido removido ou o link está incorreto." />
        </Card>
      </div>
    );
  }

  function salvar() {
    setSaved(true);
  }

  function fecharConfirmacao() {
    setSaved(false);
    if (isNovo) navigate("/estoque/produtos");
  }

  const lotes = produto ? lotesDoProduto(produto.id) : [];
  const movimentos = produto ? movimentacoesDoProduto(produto.id) : [];
  const consumo = produto ? consumoSemanal(produto.id) : [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={isNovo ? "Novo produto" : produto?.nome ?? ""}
        description={isNovo ? "Cadastre um novo item de estoque." : `Código ${produto?.codigo} · ${produto?.categoria}`}
        breadcrumbs={[{ label: "Estoque", href: "/estoque" }, { label: "Produtos", href: "/estoque/produtos" }, { label: isNovo ? "Novo produto" : produto?.nome ?? "" }]}
        meta={produto && produto.saldoAtual < produto.estoqueMinimo ? <Badge tone="danger" dot>Abaixo do mínimo</Badge> : undefined}
        actions={<Button variant="primary" icon={SaveAdd} onClick={salvar}>{isNovo ? "Cadastrar produto" : "Salvar alterações"}</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Dados do produto" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} wrapperClassName="sm:col-span-2" />
            <Input label="Código" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <Select label="Categoria" required placeholder="Selecione a categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} options={CATEGORIAS.map((c) => ({ value: c, label: c }))} />
            <Input label="Unidade" required placeholder="caixa, unidade, frasco..." value={unidade} onChange={(e) => setUnidade(e.target.value)} />
            <Select label="Fornecedor preferido" placeholder="Selecione o fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} options={FORNECEDORES.map((f) => ({ value: f, label: f }))} />
            <Input type="number" min={0} label="Estoque mínimo" required value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} />
            <Input type="number" min={0} label="Estoque máximo" required value={estoqueMaximo} onChange={(e) => setEstoqueMaximo(e.target.value)} />
          </CardBody>
        </Card>

        {produto && (
          <Card>
            <CardHeader title="Resumo" />
            <CardBody className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-text-muted">Saldo atual</span><span className="tabular font-medium text-text">{produto.saldoAtual} {produto.unidade}</span></div>
              <div className="flex items-center justify-between"><span className="text-text-muted">Local</span><span className="text-text">{produto.local}</span></div>
              <div className="flex items-center justify-between"><span className="text-text-muted">Custo unitário</span><span className="tabular text-text">{brl(produto.custoUnitCents)}</span></div>
              <div className="flex items-center justify-between"><span className="text-text-muted">Valor em estoque</span><span className="tabular font-medium text-text">{brl(produto.custoUnitCents * produto.saldoAtual)}</span></div>
            </CardBody>
          </Card>
        )}
      </div>

      {produto && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Consumo semanal" description="Saídas registradas nas últimas 12 semanas" />
              <CardBody>
                <LineChart title="Consumo semanal" area data={consumo.map((c) => ({ label: c.label, saida: c.saida }))} series={[{ key: "saida", label: "Consumo" }]} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Lotes" />
              {lotes.length === 0 ? (
                <EmptyState title="Sem controle de lote" description="Este item não é controlado por lote/validade." />
              ) : (
                <Table>
                  <THead><TR><TH>Lote</TH><TH>Validade</TH><TH align="right">Qtd.</TH></TR></THead>
                  <TBody>
                    {lotes.map((l) => (
                      <TR key={l.id}>
                        <TD className="tabular">{l.lote}</TD>
                        <TD className="text-text-muted">{dateBR(l.validade)}</TD>
                        <TD numeric>{l.quantidade}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="Movimentações" description="Histórico de entradas e saídas deste produto" />
            {movimentos.length === 0 ? (
              <EmptyState title="Nenhuma movimentação registrada" />
            ) : (
              <Table>
                <THead><TR><TH>Tipo</TH><TH align="right">Qtd.</TH><TH>Documento</TH><TH>Usuário</TH><TH>Data</TH></TR></THead>
                <TBody>
                  {movimentos.slice(0, 20).map((m) => (
                    <TR key={m.id}>
                      <TD><Badge tone={MOVIMENTO_TIPO_META[m.tipo as MovimentoTipo].tone} dot>{MOVIMENTO_TIPO_META[m.tipo as MovimentoTipo].label}</Badge></TD>
                      <TD numeric>{m.quantidade}</TD>
                      <TD className="text-text-muted">{m.documento ?? m.motivo ?? "—"}</TD>
                      <TD className="text-text-muted">{m.usuario}</TD>
                      <TD className="text-text-muted">{dateBR(m.data)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </>
      )}

      <Modal
        open={saved}
        onClose={fecharConfirmacao}
        title={isNovo ? "Produto cadastrado" : "Alterações salvas"}
        description={isNovo ? `${nome || "O produto"} foi adicionado ao catálogo de estoque.` : "As alterações deste produto foram salvas."}
        footer={<Button variant="primary" onClick={fecharConfirmacao}>Entendi</Button>}
      />
    </div>
  );
}

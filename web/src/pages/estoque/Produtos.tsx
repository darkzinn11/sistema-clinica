import { Add, SearchNormal1 } from "iconsax-reactjs";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { CATEGORIAS, produtos } from "@/lib/mock/estoque";

export default function Produtos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");

  const filtered = produtos.filter((p) => {
    if (categoria && p.categoria !== categoria) return false;
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !p.codigo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Produtos"
        description="Cadastro de itens de estoque da clínica."
        breadcrumbs={[{ label: "Estoque", href: "/estoque" }, { label: "Produtos" }]}
        actions={<ButtonLink to="/estoque/produtos/novo" variant="primary" icon={Add}>Novo produto</ButtonLink>}
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2 border-b border-border">
          <Input icon={SearchNormal1} placeholder="Buscar por nome ou código" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar produtos" wrapperClassName="min-w-56 flex-1" />
          <Select aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Todas as categorias" wrapperClassName="w-52" options={CATEGORIAS.map((c) => ({ value: c, label: c }))} />
        </CardBody>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhum produto encontrado" description="Ajuste os filtros ou cadastre um novo produto." action={<ButtonLink to="/estoque/produtos/novo" variant="primary" icon={Add}>Novo produto</ButtonLink>} />
        ) : (
          <>
            <Table>
              <THead>
                <TR><TH>Produto</TH><TH>Código</TH><TH>Categoria</TH><TH>Unidade</TH><TH align="right">Saldo</TH><TH>Fornecedor preferido</TH><TH align="right">Custo unitário</TH></TR>
              </THead>
              <TBody>
                {filtered.slice(0, 30).map((p) => (
                  <TR key={p.id} interactive onClick={() => navigate(`/estoque/produtos/${p.id}`)}>
                    <TD className="font-medium text-text">{p.nome}</TD>
                    <TD className="tabular text-text-muted">{p.codigo}</TD>
                    <TD className="text-text-muted">{p.categoria}</TD>
                    <TD className="text-text-muted">{p.unidade}</TD>
                    <TD numeric>{p.saldoAtual}</TD>
                    <TD className="text-text-muted">{p.fornecedorPreferido}</TD>
                    <TD numeric>{brl(p.custoUnitCents)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={30} label="produtos" />
          </>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { Add, SearchNormal1, TickCircle, Trash } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Drawer, Modal } from "@/components/ui/overlay";
import { FormSection } from "@/components/ui/misc";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ENTITY_CONFIGS, type EntityField, type EntityRow } from "@/lib/mock/cadastros";

function defaultsFor(fields: EntityField[]): Record<string, string | boolean> {
  return Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? false : ""]));
}

function depthOf(row: EntityRow, rows: EntityRow[]): number {
  let depth = 0;
  let current = row;
  const seen = new Set<string>();
  while (current.parentId && typeof current.parentId === "string" && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = rows.find((r) => r.id === current.parentId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

function FieldControl({ field, value, onChange }: { field: EntityField; value: string | boolean; onChange: (v: string | boolean) => void }) {
  if (field.type === "checkbox") {
    return <Checkbox label={field.label} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (field.type === "select") {
    return <Select label={field.label} value={String(value)} onChange={(e) => onChange(e.target.value)} options={field.options} placeholder="Selecione" required={field.required} />;
  }
  if (field.type === "textarea") {
    return <Textarea label={field.label} value={String(value)} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} />;
  }
  return (
    <Input
      label={field.label}
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : field.type}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      suffix={field.suffix}
      required={field.required}
    />
  );
}

export default function CadastroGenerico() {
  const { entity = "" } = useParams();
  // key={entity} força remontar ao trocar de cadastro, reiniciando todo o estado local
  // (lista, busca, drawer) sem precisar sincronizar isso manualmente em um efeito.
  return <CadastroGenericoView key={entity} entity={entity} />;
}

function CadastroGenericoView({ entity }: { entity: string }) {
  const config = ENTITY_CONFIGS[entity];

  const [rows, setRows] = useState<EntityRow[]>(config?.rows ?? []);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<EntityRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [singleFormValues, setSingleFormValues] = useState<Record<string, string>>(() =>
    config?.singleForm
      ? {
          razaoSocial: "Clínica Vida Plena Ltda.",
          nomeFantasia: "Clínica Vida Plena",
          cnpj: "12.345.678/0001-90",
          telefone: "(98) 3200-1000",
          email: "contato@vidaplena.com.br",
          endereco: "Av. dos Holandeses, 1200",
          cidade: "São Luís / MA",
          inscricaoEstadual: "12.345.678-9",
          inscricaoMunicipal: "987654-3",
          regimeTributario: "Simples Nacional",
        }
      : ({} as Record<string, string>),
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!config || config.tree) return rows;
    if (query === "") return rows;
    return rows.filter((r) => config.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(query)));
  }, [rows, query, config]);

  if (!config) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Cadastro" breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Não encontrado" }]} />
        <Card>
          <EmptyState title="Cadastro não encontrado" description="Esse tipo de cadastro não existe no protótipo." />
        </Card>
      </div>
    );
  }

  function openCreate() {
    setEditingId(null);
    setFormValues(defaultsFor(config.fields));
    setDrawerOpen(true);
  }

  function openEdit(row: EntityRow) {
    setEditingId(row.id);
    setFormValues(
      Object.fromEntries(
        config.fields.map((f) => {
          const raw = row[f.key];
          if (f.type === "checkbox") return [f.key, Boolean(raw)];
          return [f.key, raw === undefined ? "" : String(raw)];
        }),
      ),
    );
    setDrawerOpen(true);
  }

  function handleSave() {
    if (editingId) {
      setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...formValues } : r)));
      setToast("Registro atualizado com sucesso.");
    } else {
      const id = `${entity}-novo-${Date.now()}`;
      setRows((prev) => [{ id, ...formValues } as EntityRow, ...prev]);
      setToast("Registro criado com sucesso.");
    }
    setDrawerOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDrawerOpen(false);
    setToast("Registro excluído.");
  }

  if (config.singleForm) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title={config.title} description={config.description} breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: config.title }]} />
        {toast && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
            <TickCircle size={16} aria-hidden />
            {toast}
          </div>
        )}
        <Card>
          <CardBody>
            <FormSection title={config.title} description="Essas informações aparecem em notas fiscais e documentos emitidos pelo sistema.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {config.fields.map((field) => (
                  <FieldControl key={field.key} field={field} value={singleFormValues[field.key] ?? ""} onChange={(v) => setSingleFormValues((prev) => ({ ...prev, [field.key]: String(v) }))} />
                ))}
              </div>
            </FormSection>
          </CardBody>
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button variant="primary" onClick={() => setToast("Dados da empresa salvos com sucesso.")}>
              Salvar alterações
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={config.title}
        description={config.description}
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: config.title }]}
        actions={
          <Button variant="primary" icon={Add} onClick={openCreate}>
            {config.newLabel}
          </Button>
        }
      />

      {toast && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {!config.tree && (
          <Input placeholder={`Buscar em ${config.title.toLowerCase()}…`} icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={`Buscar em ${config.title}`} wrapperClassName="max-w-sm" />
        )}

        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={SearchNormal1} title="Nenhum registro encontrado" description="Ajuste a busca ou cadastre um novo registro." />
          ) : (
            <>
              <Table>
                <THead>
                  <tr>
                    {config.columns.map((c) => (
                      <TH key={c.key} align={c.numeric ? "right" : "left"}>
                        {c.label}
                      </TH>
                    ))}
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((row) => (
                    <TR key={row.id} interactive onClick={() => openEdit(row)}>
                      {config.columns.map((c, i) => {
                        const raw = row[c.key];
                        const indent = config.tree && i === 0 ? depthOf(row, rows) * 20 : 0;
                        return (
                          <TD key={c.key} numeric={c.numeric} style={indent ? { paddingLeft: 16 + indent } : undefined}>
                            {typeof raw === "boolean" ? (
                              <Badge tone={raw ? "success" : "neutral"} dot>
                                {raw ? "Sim" : "Não"}
                              </Badge>
                            ) : c.key === "status" ? (
                              <Badge tone={raw === "Ativo" ? "success" : "neutral"} dot>
                                {String(raw)}
                              </Badge>
                            ) : (
                              String(raw ?? "—")
                            )}
                          </TD>
                        );
                      })}
                    </TR>
                  ))}
                </TBody>
              </Table>
              <TableFooter total={filtered.length} pageSize={Math.max(filtered.length, 1)} label="registros" />
            </>
          )}
        </Card>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? "Editar registro" : config.newLabel}
        footer={
          <div className="flex w-full items-center justify-between">
            {editingId ? (
              <Button variant="danger" icon={Trash} onClick={() => setDeleteTarget(rows.find((r) => r.id === editingId) ?? null)}>
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {config.fields.map((field) => (
            <FieldControl key={field.key} field={field} value={formValues[field.key] ?? (field.type === "checkbox" ? false : "")} onChange={(v) => setFormValues((prev) => ({ ...prev, [field.key]: v }))} />
          ))}
        </div>
      </Drawer>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Excluir registro"
        description={deleteTarget ? `Tem certeza que deseja excluir "${deleteTarget.nome ?? deleteTarget.codigo ?? deleteTarget.id}"? Essa ação não pode ser desfeita.` : undefined}
        tone="danger"
        icon={Trash}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Excluir
            </Button>
          </>
        }
      />
    </div>
  );
}

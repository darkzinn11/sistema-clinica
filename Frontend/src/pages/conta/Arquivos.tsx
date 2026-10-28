import { IconCircle } from "@/components/ui/icon-circle";
import { useState } from "react";
import { Chart21, DocumentCode, DocumentText, DocumentText1, DocumentUpload, Gallery, Grid2, RowVertical, SearchNormal1 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import LiquidTabs from "@/components/pinui/LiquidTabs";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Meter } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { dateBR } from "@/lib/format";
import { clinicFiles, fileFolders, storageLimitGb, storageUsedGb, type ClinicFile, type FileKind } from "@/lib/mock/conta";

const KIND_ICON: Record<FileKind, IconType> = {
  pdf: DocumentText,
  image: Gallery,
  doc: DocumentText1,
  sheet: Chart21,
  xml: DocumentCode,
  other: DocumentText,
};

function sizeLabel(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  return `${kb} KB`;
}

function FileIcon({ kind }: { kind: FileKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <IconCircle tone="accent" size="lg">
      <Icon size={20} aria-hidden />
    </IconCircle>
  );
}

export default function Arquivos() {
  const [folderId, setFolderId] = useState("todos");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = clinicFiles.filter(
    (f) => (folderId === "todos" || f.folderId === folderId) && f.name.toLowerCase().includes(query.toLowerCase()),
  );

  const searchInput = <Input icon={SearchNormal1} placeholder="Buscar arquivo" aria-label="Buscar arquivo" value={query} onChange={(e) => setQuery(e.target.value)} />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Arquivos" description="Documentos, laudos e modelos usados pela clínica." breadcrumbs={[{ label: "Conta" }, { label: "Arquivos" }]} />
      <LiquidTabs
        label="Pastas"
        tabs={fileFolders.map((f) => ({ label: f.name, count: f.count }))}
        active={Math.max(0, fileFolders.findIndex((f) => f.id === folderId))}
        onChange={(i) => setFolderId(fileFolders[i].id)}
        actions={<div className="hidden w-64 lg:block">{searchInput}</div>}
      >
        {() => (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
              <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-5 text-center transition-colors hover:border-accent/50">
                <input type="file" multiple className="sr-only" />
                <DocumentUpload size={24} className="text-text-subtle" aria-hidden />
                <p className="text-sm text-text-muted">
                  <span className="font-medium text-accent">Clique para enviar</span> ou arraste arquivos aqui
                </p>
              </label>
              <div className="flex flex-col justify-center rounded-lg bg-surface px-4 py-3 sm:w-72">
                <Meter value={storageUsedGb} max={storageLimitGb} label="Armazenamento" tone="accent" showValue={`${storageUsedGb.toLocaleString("pt-BR")} GB de ${storageLimitGb} GB`} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* No celular a busca não cabe ao lado das abas: vem para cá. */}
              <div className="min-w-56 flex-1 lg:hidden">{searchInput}</div>
              <Segmented
                label="Visualização"
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: "grid", label: "Grade", icon: Grid2 },
                  { value: "list", label: "Lista", icon: RowVertical },
                ]}
              />
            </div>

            {filtered.length === 0 ? (
              <EmptyState title="Nenhum arquivo encontrado" description="Tente outra pasta ou outro termo de busca." />
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((f) => (
                  <Card key={f.id} className="flex flex-col gap-2 p-3">
                    <FileIcon kind={f.kind} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text" title={f.name}>{f.name}</p>
                      <p className="text-xs text-text-muted">{sizeLabel(f.sizeKb)} · {dateBR(f.updatedAt)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="-mx-4">
                <Table>
                  <THead>
                    <TR>
                      <TH>Nome</TH>
                      <TH>Responsável</TH>
                      <TH align="right">Tamanho</TH>
                      <TH align="right">Atualizado</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filtered.map((f: ClinicFile) => (
                      <TR key={f.id} interactive>
                        <TD>
                          <div className="flex items-center gap-2.5">
                            <FileIcon kind={f.kind} />
                            <span className="truncate font-medium">{f.name}</span>
                          </div>
                        </TD>
                        <TD>{f.owner}</TD>
                        <TD numeric>{sizeLabel(f.sizeKb)}</TD>
                        <TD numeric>{dateBR(f.updatedAt)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </LiquidTabs>
    </div>
  );
}

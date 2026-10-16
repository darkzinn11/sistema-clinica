import { IconCircle } from "@/components/ui/icon-circle";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { SearchNormal1 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ENTITY_CONFIGS, ENTITY_DESCRIPTIONS, ENTITY_GROUPS, ENTITY_ICON, ENTITY_RECORD_COUNTS } from "@/lib/mock/cadastros";

const TITLES: Record<string, string> = {
  profissionais: "Profissionais",
  funcionarios: "Funcionários e usuários",
  procedimentos: "Procedimentos",
  convenios: "Convênios",
};

function titleFor(entity: string): string {
  return TITLES[entity] ?? ENTITY_CONFIGS[entity]?.title ?? entity;
}

function descriptionFor(entity: string): string {
  return ENTITY_DESCRIPTIONS[entity] ?? ENTITY_CONFIGS[entity]?.description ?? "";
}

export default function CadastrosHub() {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const groups = useMemo(
    () =>
      ENTITY_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => query === "" || titleFor(item.entity).toLowerCase().includes(query) || descriptionFor(item.entity).toLowerCase().includes(query)),
      })).filter((g) => g.items.length > 0),
    [query],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Cadastros" description="Dados mestres da clínica: pessoas, atendimento, financeiro e documentos." breadcrumbs={[{ label: "Cadastros" }]} />

      <div className="flex flex-col gap-6">
        <Input placeholder="Buscar cadastro…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar cadastro" wrapperClassName="max-w-md" />

        {groups.length === 0 && (
          <Card>
            <EmptyState icon={SearchNormal1} title="Nenhum cadastro encontrado" description="Tente buscar por outro termo." />
          </Card>
        )}

        {groups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <Card key={group.label}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <GroupIcon size={17} aria-hidden className="text-text-muted" />
                    {group.label}
                  </span>
                }
              />
              <CardBody>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => {
                    const Icon = ENTITY_ICON[item.entity];
                    return (
                      <Link
                        key={item.entity}
                        to={item.href}
                        className="flex items-start gap-3 rounded-lg p-3.5 transition-colors hover:bg-surface/60"
                      >
                        <IconCircle tone="accent" size="md">
                          <Icon size={17} aria-hidden />
                        </IconCircle>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-base font-medium text-text">{titleFor(item.entity)}</span>
                            {item.entity !== "empresa" && <span className="tabular shrink-0 text-xs text-text-muted">{ENTITY_RECORD_COUNTS[item.entity] ?? 0}</span>}
                          </span>
                          <span className="mt-0.5 block text-sm text-text-muted">{descriptionFor(item.entity)}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

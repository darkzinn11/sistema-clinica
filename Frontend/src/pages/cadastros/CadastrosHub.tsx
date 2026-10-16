import { IconCircle, type IconCircleTone } from "@/components/ui/icon-circle";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight2, Category, SearchNormal1 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/charts";
import { cn } from "@/lib/cn";
import { ENTITY_CONFIGS, ENTITY_DESCRIPTIONS, ENTITY_GROUPS, ENTITY_ICON, ENTITY_RECORD_COUNTS } from "@/lib/mock/cadastros";

const TITLES: Record<string, string> = {
  profissionais: "Profissionais",
  funcionarios: "Funcionários e usuários",
  procedimentos: "Procedimentos",
  convenios: "Convênios",
};

/** Cada grupo ganha um tom próprio para que as seções se diferenciem de relance. */
const GROUP_TONE: Record<string, IconCircleTone> = {
  pessoas: "info",
  atendimento: "success",
  financeiro: "warning",
  clinica: "neutral",
};

/** Cadastros do dia a dia, em destaque no topo. */
const FEATURED = ["profissionais", "procedimentos", "convenios", "funcionarios"];

function titleFor(entity: string): string {
  return TITLES[entity] ?? ENTITY_CONFIGS[entity]?.title ?? entity;
}

function descriptionFor(entity: string): string {
  return ENTITY_DESCRIPTIONS[entity] ?? ENTITY_CONFIGS[entity]?.description ?? "";
}

function countLabel(entity: string): string | null {
  if (entity === "empresa") return null;
  const n = ENTITY_RECORD_COUNTS[entity] ?? 0;
  return n === 1 ? "1 registro" : `${n} registros`;
}

const hrefFor = Object.fromEntries(ENTITY_GROUPS.flatMap((g) => g.items.map((i) => [i.entity, i.href])));

export default function CadastrosHub() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("todos");
  const query = search.trim().toLowerCase();
  const total = ENTITY_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  const groups = useMemo(
    () =>
      ENTITY_GROUPS.filter((g) => category === "todos" || g.id === category)
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => query === "" || titleFor(item.entity).toLowerCase().includes(query) || descriptionFor(item.entity).toLowerCase().includes(query),
          ),
        }))
        .filter((g) => g.items.length > 0),
    [query, category],
  );

  const categories = [{ id: "todos", label: "Todos", icon: Category, count: total }, ...ENTITY_GROUPS.map((g) => ({ id: g.id, label: g.label, icon: g.icon, count: g.items.length }))];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Cadastros" description="Configure as informações base que o restante do sistema usa." breadcrumbs={[{ label: "Cadastros" }]} />

      <div className="flex flex-col gap-8">
        <section aria-labelledby="cadastros-principais">
          <h2 id="cadastros-principais" className="mb-3 text-sm font-medium text-text-muted">
            Mais usados
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ui-stat-strip" data-columns="4">
            {FEATURED.map((entity) => {
              const Icon = ENTITY_ICON[entity];
              return (
                <Link
                  key={entity}
                  to={hrefFor[entity]}
                  className="group block rounded-[inherit] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <StatCard
                    label={titleFor(entity)}
                    value={(ENTITY_RECORD_COUNTS[entity] ?? 0).toLocaleString("pt-BR")}
                    icon={<Icon />}
                    className="h-full"
                    footer={
                      <span className="flex items-center gap-1 text-text-muted group-hover:text-accent">
                        Ver cadastros
                        <ArrowRight2 size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    }
                  />
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-label="Todos os cadastros" className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <Input placeholder="Buscar cadastro…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar cadastro" />
            <nav aria-label="Categorias" className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
              {categories.map((c) => {
                const active = category === c.id;
                const CatIcon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    aria-pressed={active}
                    className={cn(
                      "ui-nav-link flex h-10 shrink-0 items-center gap-3 rounded-full px-3 text-left text-base font-medium lg:w-full",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      active ? "ui-nav-active bg-accent-muted text-text" : "text-text-muted hover:bg-surface hover:text-text",
                    )}
                  >
                    <CatIcon size={18} aria-hidden variant={active ? "Bulk" : "Linear"} className="shrink-0" />
                    <span className="whitespace-nowrap lg:flex-1">{c.label}</span>
                    <span className="tabular text-xs text-text-muted">{c.count}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-6">
            {groups.length === 0 && (
              <Card>
                <EmptyState icon={SearchNormal1} title="Nenhum cadastro encontrado" description="Tente outro termo ou escolha outra categoria." />
              </Card>
            )}

            {groups.map((group) => (
              <Card key={group.id} className="overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-md font-semibold text-text">{group.label}</h2>
                  <p className="mt-0.5 text-sm text-text-muted">{group.description}</p>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((item) => {
                    const Icon = ENTITY_ICON[item.entity];
                    const count = countLabel(item.entity);
                    return (
                      <li key={item.entity}>
                        <Link
                          to={item.href}
                          className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface/60 focus-visible:bg-surface/60 focus-visible:outline-none"
                        >
                          <IconCircle tone={GROUP_TONE[group.id]} size="md">
                            <Icon size={16} aria-hidden />
                          </IconCircle>
                          <span className="min-w-0 flex-1">
                            <span className="block text-base font-medium text-text">{titleFor(item.entity)}</span>
                            <span className="block truncate text-sm text-text-muted">{descriptionFor(item.entity)}</span>
                          </span>
                          {count && <span className="tabular hidden shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs text-text-muted sm:inline">{count}</span>}
                          <ArrowRight2 size={16} aria-hidden className="shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

import { IconCircle, type IconCircleTone } from "@/components/ui/icon-circle";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight2, SearchNormal1 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/charts";
import LiquidTabs from "@/components/pinui/LiquidTabs";
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
  const query = search.trim().toLowerCase();
  const total = ENTITY_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  const categories = [{ id: "todos", label: "Todos", count: total }, ...ENTITY_GROUPS.map((g) => ({ id: g.id, label: g.label, count: g.items.length }))];

  const groupsFor = (category: string) =>
    ENTITY_GROUPS.filter((g) => category === "todos" || g.id === category)
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => query === "" || titleFor(item.entity).toLowerCase().includes(query) || descriptionFor(item.entity).toLowerCase().includes(query),
        ),
      }))
      .filter((g) => g.items.length > 0);

  const searchInput = (
    <Input placeholder="Buscar cadastro…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar cadastro" />
  );

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

        <LiquidTabs
          label="Categorias de cadastro"
          tabs={categories.map((c) => ({ label: c.label, count: c.count }))}
          actions={<div className="hidden w-72 lg:block">{searchInput}</div>}
        >
          {(active) => {
            const groups = groupsFor(categories[active].id);
            // Numa categoria só, o título do grupo repetiria o nome da aba: fica só a descrição.
            const single = categories[active].id !== "todos";
            return (
              <div className="flex flex-col">
                {/* No celular a busca não cabe ao lado das abas: vem para o topo do conteúdo. */}
                <div className="mb-5 lg:hidden">{searchInput}</div>

                {groups.length === 0 && (
                  <EmptyState icon={SearchNormal1} title="Nenhum cadastro encontrado" description="Tente outro termo ou escolha outra categoria." />
                )}

                <div className="flex flex-col">
                  {groups.map((group) => (
                    <section key={group.id} aria-labelledby={`grupo-${group.id}`} className="border-b border-border pb-2 pt-6 first:pt-0 last:border-0 last:pb-0">
                      <h2 id={`grupo-${group.id}`} className={single ? "sr-only" : "text-md font-semibold text-text"}>{group.label}</h2>
                      <p className={single ? "text-sm text-text-muted" : "mt-0.5 text-sm text-text-muted"}>{group.description}</p>
                      <ul className="-mx-3 mt-3 divide-y divide-border">
                        {group.items.map((item) => {
                          const Icon = ENTITY_ICON[item.entity];
                          const count = countLabel(item.entity);
                          return (
                            <li key={item.entity}>
                              <Link
                                to={item.href}
                                className="group flex items-center gap-4 rounded-lg px-3 py-3.5 transition-colors hover:bg-surface/60 focus-visible:bg-surface/60 focus-visible:outline-none"
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
                    </section>
                  ))}
                </div>
              </div>
            );
          }}
        </LiquidTabs>
      </div>
    </div>
  );
}

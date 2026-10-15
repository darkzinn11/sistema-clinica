import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type AppointmentStatus } from "@/components/ui/status-badge";

const ALL_STATUSES: AppointmentStatus[] = [
  "confirmado",
  "nao_confirmado",
  "aguardando",
  "aguardando_pagamento",
  "chamando",
  "em_atendimento",
  "atendido",
  "remarcado",
  "cancelado_pelo_profissional",
  "desmarcado_pelo_paciente",
  "nao_compareceu",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10">
      <header>
        <h1 className="text-display font-bold text-text">Design system</h1>
        <p className="text-base text-text-muted">
          Primitivos do clone, construídos a partir de replica/design/tokens.json
          e replica/design/components.md. Página de checagem — não faz parte do
          produto final.
        </p>
      </header>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Salvar</Button>
          <Button variant="secondary">Filtrar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="danger">Excluir</Button>
          <Button variant="primary" loading>
            Salvando
          </Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
        </div>
      </Section>

      <Section title="Status de agendamento (11 estados)">
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Campos de formulário">
        <div className="grid max-w-sm gap-4">
          <Input label="Celular" placeholder="(98) 98348-2445" />
          <Input label="CPF" placeholder="000.000.000-00" error="CPF inválido" />
        </div>
      </Section>

      <Section title="Barra de progresso (confirmação de agendamentos)">
        <div className="max-w-sm">
          <ProgressBar value={32} label="32% confirmada · 19 de 60" />
        </div>
      </Section>

      <Section title="Card / painel">
        <Card className="max-w-sm">
          <h3 className="text-base font-semibold text-text">Sala de Ultrassom</h3>
          <p className="text-sm text-text-muted">14:30 · US morfológico do 1º trimestre</p>
        </Card>
      </Section>

      <Section title="Estado vazio">
        <div className="max-w-sm">
          <EmptyState
            title="Nenhum paciente na fila de espera deste profissional."
            action={<Button size="sm">+ Adicionar paciente</Button>}
          />
        </div>
      </Section>

      <Section title="Cores de texto">
        <div className="flex flex-col gap-1">
          <p className="text-text">text — texto principal</p>
          <p className="text-text-muted">text-muted — texto secundário</p>
          <p className="text-text-subtle">text-subtle — texto terciário/placeholder</p>
          <p className="text-accent">accent — links e ênfase</p>
          <p className="text-danger">danger — erro</p>
          <p className="text-success">success — sucesso</p>
        </div>
      </Section>
    </div>
  );
}

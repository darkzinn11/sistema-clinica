import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate, useParams } from "react-router";
import { Add, Calendar, Chart2, Clock, Personalcard } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/misc";
import LiquidTabs from "@/components/pinui/LiquidTabs";
import { DeactivateModal } from "@/components/pacientes/DeactivateModal";
import { Agendamentos, Alteracoes, Dados, Resumo } from "@/components/pacientes/FichaTabs";
import { PerfilHeader } from "@/components/pacientes/PerfilHeader";
import { ApiError } from "@/lib/api/client";
import { usePatient, usePriorities, useReactivatePatient } from "@/lib/api/pacientes";
import { useAuth } from "@/lib/auth/auth";

export default function Page() {
  const { id = "" } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const patient = usePatient(id);
  const priorities = usePriorities();
  const reactivate = useReactivatePatient();
  const [deactivating, setDeactivating] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  if (patient.isPending) return <div className="mx-auto max-w-7xl"><Skeleton className="mb-4 h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (patient.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Add}
          title="Paciente não encontrado"
          description={patient.error instanceof ApiError && patient.error.status !== 404 ? patient.error.message : "O cadastro pode ter sido removido ou o link está incorreto."}
          action={<ButtonLink to="/pacientes" variant="primary">Voltar para a lista de pacientes</ButtonLink>}
        />
      </div>
    );
  }

  const p = patient.data;
  const base = `/pacientes/${p.id}`;
  const full = can("pacientes:ler");
  const tabs = [
    { label: "Resumo", href: base, icon: Chart2 },
    { label: "Dados", href: `${base}/dados`, icon: Personalcard },
    ...(full ? [{ label: "Agendamentos", href: `${base}/agendamentos`, icon: Calendar }, { label: "Alterações", href: `${base}/alteracoes`, icon: Clock }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={p.nome}
        breadcrumbs={[{ label: "Pacientes", href: "/pacientes" }, { label: p.nome }]}
      />

      <PerfilHeader
        patient={p}
        priority={priorities.data?.find((x) => x.id === p.prioridadeId)?.nome}
        canEdit={can("pacientes:editar")}
        canInactivate={can("pacientes:inativar")}
        reactivating={reactivate.isPending}
        onDeactivate={() => setDeactivating(true)}
        onReactivate={() => reactivate.mutateAsync(p.id).then(() => setBanner("Cadastro reativado.")).catch((e) => setBanner(e instanceof ApiError ? e.message : "Não foi possível reativar."))}
      />

      {banner && <div role="status" className="mb-4 rounded-lg border border-accent/30 bg-accent-muted px-4 py-2.5 text-sm text-accent">{banner}</div>}

      {/* Cada aba é uma rota: a aba ativa vem do endereço (a mais específica ganha; a raiz é o Resumo). */}
      <LiquidTabs
        label="Seções da ficha"
        tabs={tabs.map((t) => ({ label: t.label, icon: t.icon }))}
        active={Math.max(0, tabs.findIndex((t) => t.href !== base && (pathname === t.href || pathname.startsWith(`${t.href}/`))))}
        onChange={(i) => navigate(tabs[i].href)}
      >
        {() => (
          <Routes>
            <Route index element={<Resumo patient={p} canSeeAppointments={full} />} />
            <Route path="dados" element={<Dados patient={p} />} />
            {full && <Route path="agendamentos" element={<Agendamentos patientId={p.id} />} />}
            {full && <Route path="alteracoes" element={<Alteracoes patientId={p.id} />} />}
            <Route path="*" element={<EmptyState title="Página não encontrada" description="Use as abas acima." />} />
          </Routes>
        )}
      </LiquidTabs>

      <DeactivateModal patient={deactivating ? p : null} onClose={() => setDeactivating(false)} onDone={() => { setDeactivating(false); setBanner("Cadastro inativado."); }} />
    </div>
  );
}

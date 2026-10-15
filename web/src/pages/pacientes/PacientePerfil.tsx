import { useEffect, useState } from "react";
import { Route, Routes, useParams } from "react-router";
import {
  Add,
  Calendar,
  Chart2,
  ClipboardText,
  ClipboardTick,
  DocumentText,
  Folder2,
  Hospital,
  Personalcard,
  ReceiptText,
  Wallet2,
} from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkTabs } from "@/components/ui/tabs";
import { patientById } from "@/lib/mock/core";
import { PerfilHeader } from "@/components/pacientes/perfil-header";
import { Resumo } from "@/components/pacientes/perfil/Resumo";
import { Dados } from "@/components/pacientes/perfil/Dados";
import { Prontuario } from "@/components/pacientes/perfil/Prontuario";
import { Prescricoes } from "@/components/pacientes/perfil/Prescricoes";
import { Exames } from "@/components/pacientes/perfil/Exames";
import { Documentos } from "@/components/pacientes/perfil/Documentos";
import { Arquivos } from "@/components/pacientes/perfil/Arquivos";
import { Agendamentos } from "@/components/pacientes/perfil/Agendamentos";
import { Financeiro } from "@/components/pacientes/perfil/Financeiro";
import { Convenios } from "@/components/pacientes/perfil/Convenios";

export default function Page() {
  const { id = "" } = useParams();
  const patient = patientById(id);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3200);
    return () => clearTimeout(t);
  }, [banner]);

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={Add}
          title="Paciente não encontrado"
          description="O cadastro pode ter sido removido ou o link está incorreto."
          action={
            <ButtonLink to="/pacientes" variant="primary">
              Voltar para a lista de pacientes
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const base = `/pacientes/${patient.id}`;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={patient.name}
        breadcrumbs={[{ label: "Início", href: "/inicio" }, { label: "Pacientes", href: "/pacientes" }, { label: patient.name }]}
      />

      <PerfilHeader patient={patient} onAction={setBanner} />

      {banner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-muted px-4 py-2.5 text-sm text-accent">
          {banner}
          <button type="button" onClick={() => setBanner(null)} aria-label="Fechar aviso" className="text-accent/70 hover:text-accent">
            <Add size={14} aria-hidden className="rotate-45" />
          </button>
        </div>
      )}

      <LinkTabs
        tabs={[
          { label: "Resumo", href: base, icon: Chart2 },
          { label: "Dados", href: `${base}/dados`, icon: Personalcard },
          { label: "Prontuário", href: `${base}/prontuario`, icon: ClipboardText },
          { label: "Prescrições", href: `${base}/prescricoes`, icon: ReceiptText },
          { label: "Exames", href: `${base}/exames`, icon: ClipboardTick },
          { label: "Documentos", href: `${base}/documentos`, icon: DocumentText },
          { label: "Arquivos", href: `${base}/arquivos`, icon: Folder2 },
          { label: "Agendamentos", href: `${base}/agendamentos`, icon: Calendar },
          { label: "Financeiro", href: `${base}/financeiro`, icon: Wallet2 },
          { label: "Convênios", href: `${base}/convenios`, icon: Hospital },
        ]}
      />

      <div className="pt-6">
        <Routes>
          <Route index element={<Resumo patient={patient} />} />
          <Route path="dados" element={<Dados patient={patient} />} />
          <Route path="prontuario" element={<Prontuario patient={patient} />} />
          <Route path="prescricoes" element={<Prescricoes patient={patient} />} />
          <Route path="exames" element={<Exames patient={patient} />} />
          <Route path="documentos" element={<Documentos patient={patient} />} />
          <Route path="arquivos" element={<Arquivos patient={patient} />} />
          <Route path="agendamentos" element={<Agendamentos patient={patient} />} />
          <Route path="financeiro" element={<Financeiro patient={patient} />} />
          <Route path="convenios" element={<Convenios patient={patient} />} />
        </Routes>
      </div>
    </div>
  );
}

import { NavLink, Navigate, Route, Routes } from "react-router";
import { PageHeader } from "@/components/ui/page-header";
import { ALL_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/cn";
import Gerais from "@/pages/configuracoes/sections/Gerais";
import AgendamentoOnline from "@/pages/configuracoes/sections/AgendamentoOnline";
import AreaDoPaciente from "@/pages/configuracoes/sections/AreaDoPaciente";
import CamposObrigatorios from "@/pages/configuracoes/sections/CamposObrigatorios";
import FaixasEtarias from "@/pages/configuracoes/sections/FaixasEtarias";
import Triagem from "@/pages/configuracoes/sections/Triagem";
import TotemEGuiches from "@/pages/configuracoes/sections/TotemEGuiches";
import ChamadaDeTv from "@/pages/configuracoes/sections/ChamadaDeTv";
import Integracoes from "@/pages/configuracoes/sections/Integracoes";
import Privacidade from "@/pages/configuracoes/sections/Privacidade";
import UsuariosConectados from "@/pages/configuracoes/sections/UsuariosConectados";
import Compras from "@/pages/configuracoes/sections/Compras";

const configNav = ALL_ITEMS.find((i) => i.href === "/configuracoes");

export default function Page() {
  const children = configNav?.children ?? [];
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Configurações"
        description="Regras e preferências que moldam como a clínica funciona no dia a dia."
        breadcrumbs={[{ label: "Administração" }, { label: "Configurações" }]}
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav aria-label="Seções de configurações" className="shrink-0 lg:sticky lg:top-6 lg:w-64">
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {children.map((c) => (
              <li key={c.href} className="shrink-0 lg:shrink">
                <NavLink
                  to={c.href}
                  className={({ isActive }) =>
                    cn(
                      "block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-accent-muted text-accent" : "text-text-muted hover:bg-surface hover:text-text",
                    )
                  }
                >
                  {c.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 flex-1 pb-16">
          <Routes>
            <Route index element={<Navigate to="gerais" replace />} />
            <Route path="gerais" element={<Gerais />} />
            <Route path="agendamento-online" element={<AgendamentoOnline />} />
            <Route path="area-do-paciente" element={<AreaDoPaciente />} />
            <Route path="campos-obrigatorios" element={<CamposObrigatorios />} />
            <Route path="faixas-etarias" element={<FaixasEtarias />} />
            <Route path="triagem" element={<Triagem />} />
            <Route path="totem-e-guiches" element={<TotemEGuiches />} />
            <Route path="chamada-de-tv" element={<ChamadaDeTv />} />
            <Route path="integracoes" element={<Integracoes />} />
            <Route path="privacidade" element={<Privacidade />} />
            <Route path="usuarios-conectados" element={<UsuariosConectados />} />
            <Route path="compras" element={<Compras />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

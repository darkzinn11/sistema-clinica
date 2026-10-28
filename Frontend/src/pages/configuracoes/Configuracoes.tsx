import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import LiquidTabs from "@/components/pinui/LiquidTabs";
import { PageHeader } from "@/components/ui/page-header";
import { ALL_ITEMS } from "@/lib/nav";
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
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Cada seção é uma rota: a aba ativa vem do endereço.
  const activeIndex = children.findIndex((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Configurações"
        description="Regras e preferências que moldam como a clínica funciona no dia a dia."
        breadcrumbs={[{ label: "Configurações" }]}
      />
      <LiquidTabs
        label="Seções de configurações"
        tabs={children.map((c) => ({ label: c.label }))}
        active={Math.max(0, activeIndex)}
        onChange={(i) => navigate(children[i].href)}
        flush
      >
        {() => (
          <div className="ui-flush-sections">
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
        )}
      </LiquidTabs>
    </div>
  );
}

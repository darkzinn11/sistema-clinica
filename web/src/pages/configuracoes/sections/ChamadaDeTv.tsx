import { useState } from "react";
import { Refresh2, TickCircle, VideoPlay } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch, Modal } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import { ColorField } from "@/components/configuracoes/ColorField";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { tvTemplates } from "@/lib/mock/configuracoes";

interface Toggles {
  professionalName: boolean;
  locationName: boolean;
  voiceCall: boolean;
  repeatCall: boolean;
  preConsulta: boolean;
  posConsulta: boolean;
  lastTickets: boolean;
  birthDate: boolean;
  beepTwice: boolean;
  muteVideo: boolean;
}

interface State {
  templateId: string;
  logoUrl: string;
  colorPrimary: string;
  colorSecondary: string;
  colorTertiary: string;
  colorBg: string;
  intervalSec: string;
  videoId: string;
  toggles: Toggles;
}

const TOGGLE_LABELS: { key: keyof Toggles; label: string }[] = [
  { key: "professionalName", label: "Nome do profissional" },
  { key: "locationName", label: "Nome do local" },
  { key: "voiceCall", label: "Chamada por voz" },
  { key: "repeatCall", label: "Chamar mais de uma vez" },
  { key: "preConsulta", label: "Pré-consulta" },
  { key: "posConsulta", label: "Pós-consulta" },
  { key: "lastTickets", label: "Exibir últimas senhas" },
  { key: "birthDate", label: "Data de nascimento do paciente" },
  { key: "beepTwice", label: "Bipar apenas duas vezes" },
  { key: "muteVideo", label: "Vídeo mudo" },
];

function TemplateMiniPreview({ id, bg, primary }: { id: string; bg: string; primary: string }) {
  if (id === "minimal") {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: bg }}>
        <span className="font-display text-2xl font-bold" style={{ color: primary }}>042</span>
      </div>
    );
  }
  if (id === "duplo") {
    return (
      <div className="flex h-full" style={{ background: bg }}>
        <div className="flex flex-1 items-center justify-center border-r border-white/10">
          <span className="font-display text-lg font-bold" style={{ color: primary }}>042</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-0.5 opacity-70">
          <span className="text-[9px]" style={{ color: primary }}>039</span>
          <span className="text-[9px]" style={{ color: primary }}>038</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col justify-center gap-1 px-3" style={{ background: bg }}>
      <span className="font-display text-lg font-bold" style={{ color: primary }}>042 · Guichê 1</span>
      <span className="text-[9px] opacity-70" style={{ color: primary }}>039 · 038 · 035</span>
    </div>
  );
}

export default function ChamadaDeTv() {
  const s = useSettingsState<State>({
    templateId: "classico",
    logoUrl: "https://vidaplena.com.br/logo.png",
    colorPrimary: "#ffffff",
    colorSecondary: "#6b9af0",
    colorTertiary: "#4cc38a",
    colorBg: "#0f1115",
    intervalSec: "8",
    videoId: "dQw4w9WgXcQ",
    toggles: {
      professionalName: true,
      locationName: true,
      voiceCall: true,
      repeatCall: false,
      preConsulta: false,
      posConsulta: false,
      lastTickets: true,
      birthDate: false,
      beepTwice: false,
      muteVideo: false,
    },
  });
  const v = s.value;
  const [confirmReload, setConfirmReload] = useState(false);
  const [reloaded, setReloaded] = useState(false);

  return (
    <div>
      <Card>
        <CardHeader title="Modelo do painel" description="Escolha o layout exibido na TV da sala de espera." />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tvTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => s.set({ ...v, templateId: t.id })}
                className={cn(
                  "flex flex-col gap-2 rounded-lg p-2 text-left transition-colors",
                  v.templateId === t.id ? "bg-accent-muted" : "bg-surface hover:bg-surface-raised",
                )}
              >
                <div className="h-20 overflow-hidden rounded-md">
                  <TemplateMiniPreview id={t.id} bg={v.colorBg} primary={v.colorPrimary} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Aparência e conteúdo" />
          <CardBody className="flex flex-col gap-5">
            <Input label="URL da logo" value={v.logoUrl} onChange={(e) => s.set({ ...v, logoUrl: e.target.value })} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorField label="Cor primária" value={v.colorPrimary} onChange={(c) => s.set({ ...v, colorPrimary: c })} />
              <ColorField label="Cor secundária" value={v.colorSecondary} onChange={(c) => s.set({ ...v, colorSecondary: c })} />
              <ColorField label="Cor terciária" value={v.colorTertiary} onChange={(c) => s.set({ ...v, colorTertiary: c })} />
              <ColorField label="Cor de fundo" value={v.colorBg} onChange={(c) => s.set({ ...v, colorBg: c })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Intervalo entre chamadas" type="number" suffix="seg" value={v.intervalSec} onChange={(e) => s.set({ ...v, intervalSec: e.target.value })} />
              <Input label="ID do vídeo institucional" icon={VideoPlay} value={v.videoId} onChange={(e) => s.set({ ...v, videoId: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {TOGGLE_LABELS.map((t) => (
                <div key={t.key} className="py-1.5">
                  <Switch label={t.label} checked={v.toggles[t.key]} onChange={(c) => s.set({ ...v, toggles: { ...v.toggles, [t.key]: c } })} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Pré-visualização ao vivo" />
            <CardBody className="bg-surface">
              <div className="aspect-video overflow-hidden rounded-lg border border-border-strong">
                <div className="flex h-full flex-col justify-between p-3" style={{ background: v.colorBg }}>
                  <div className="flex items-center justify-between">
                    <span className="rounded px-2 py-0.5 text-[10px] font-semibold" style={{ color: v.colorBg, background: v.colorSecondary }}>
                      {v.logoUrl ? "LOGO" : "Clínica Vida Plena"}
                    </span>
                    {v.toggles.locationName && <span className="text-[10px] opacity-70" style={{ color: v.colorPrimary }}>Consultório 2</span>}
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="font-display text-3xl font-bold" style={{ color: v.colorPrimary }}>042</span>
                    {v.toggles.professionalName && <span className="text-xs" style={{ color: v.colorTertiary }}>Dra. Camila Esteves</span>}
                  </div>
                  {v.toggles.lastTickets ? (
                    <div className="flex items-center justify-center gap-2 text-[10px] opacity-60" style={{ color: v.colorPrimary }}>
                      <span>039</span>
                      <span>038</span>
                      <span>035</span>
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <p className="text-sm text-text-muted">Aplica o modelo e as cores atuais em todas as TVs conectadas agora.</p>
              {reloaded ? (
                <p className="flex items-center gap-2 text-sm font-medium text-success">
                  <TickCircle size={16} variant="Bold" aria-hidden /> TVs recarregadas
                </p>
              ) : (
                <Button variant="secondary" icon={Refresh2} onClick={() => setConfirmReload(true)}>
                  Recarregar todas as TVs
                </Button>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmReload}
        onClose={() => setConfirmReload(false)}
        title="Recarregar todas as TVs?"
        description="As telas conectadas vão atualizar e exibir o modelo atual em alguns segundos."
        icon={Refresh2}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReload(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmReload(false);
                setReloaded(true);
                setTimeout(() => setReloaded(false), 2600);
              }}
            >
              Recarregar
            </Button>
          </>
        }
      />

      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}

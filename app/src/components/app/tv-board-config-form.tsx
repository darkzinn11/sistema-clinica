"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTvBoardConfigAction } from "@/lib/actions";
import type { TvBoardConfig } from "@/lib/types";

const CHECKBOXES: { key: keyof TvBoardConfig; label: string }[] = [
  { key: "showProfessionalName", label: "Nome do Profissional" },
  { key: "showLocationName", label: "Nome do Local" },
  { key: "voiceCall", label: "Chamada por Voz" },
  { key: "callMoreThanOnce", label: "Chamar Mais de Uma Vez" },
  { key: "preConsulta", label: "Pré-consulta" },
  { key: "posConsulta", label: "Pós-consulta" },
  { key: "showLastCalled", label: "Exibir as Últimas Senhas Chamadas" },
  { key: "showPatientBirthdate", label: "Data de Nascimento do Paciente" },
  { key: "beepTwiceOnly", label: "Bipar apenas duas vezes" },
  { key: "mutedVideo", label: "Vídeo Mudo" },
];

export function TvBoardConfigForm({ config }: { config: TvBoardConfig }) {
  const router = useRouter();
  const [form, setForm] = useState<TvBoardConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof TvBoardConfig>(key: K, value: TvBoardConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    await saveTvBoardConfigAction(form);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="template" className="text-xs font-medium text-text-muted">
            Template
          </label>
          <select
            id="template"
            value={form.template}
            onChange={(e) => set("template", e.target.value)}
            className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text"
          >
            <option value="padrao">Padrão</option>
            <option value="compacto">Compacto</option>
            <option value="video-destaque">Vídeo em destaque</option>
          </select>
        </div>

        <Input
          label="Logo (URL da imagem)"
          value={form.logoUrl ?? ""}
          onChange={(e) => set("logoUrl", e.target.value)}
          placeholder="https://..."
        />
        <Input
          label="Intervalo (segundos)"
          type="number"
          min={1}
          value={form.intervalSeconds}
          onChange={(e) => set("intervalSeconds", Number(e.target.value))}
        />

        {(["color1", "color2", "color3", "backgroundColor"] as const).map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <label htmlFor={key} className="text-xs font-medium text-text-muted">
              {key === "backgroundColor" ? "Cor de Fundo" : `Cor ${key.slice(-1)}`}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={key}
                type="color"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-md border border-border-input bg-bg"
              />
              <input
                aria-label={`${key} em hexadecimal`}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                className="h-10 w-28 rounded-md border border-border-input bg-bg px-2 text-base text-text"
              />
            </div>
          </div>
        ))}

        <Input
          label="Vídeo (ID do Youtube)"
          value={form.youtubeVideoId ?? ""}
          onChange={(e) => set("youtubeVideoId", e.target.value)}
          placeholder="ex.: dQw4w9WgXcQ"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text">Opções</span>
        <div className="grid max-w-xl gap-2 sm:grid-cols-2">
          {CHECKBOXES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={Boolean(form[key])}
                onChange={(e) => set(key, e.target.checked as TvBoardConfig[typeof key])}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} loading={saving}>
          Salvar
        </Button>
        {saved && <span className="text-sm text-success">Configuração salva.</span>}
      </div>
    </div>
  );
}

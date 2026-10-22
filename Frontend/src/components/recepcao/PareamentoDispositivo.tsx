import { useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { saveDevice, type StoredDevice } from "@/lib/device/storage";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PareamentoDispositivo({ onPaired, testPath = "/totem/tipos", tipo = "totem" }: { onPaired: (device: StoredDevice) => void; testPath?: string; tipo?: "totem" | "painel" }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function pair() {
    setLoading(true); setError(null);
    try {
      await api(testPath, { token: token.trim() });
      const device = { token: token.trim(), tipo } as StoredDevice;
      saveDevice(device); onPaired(device);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setError("Código inválido ou revogado.");
      else if (cause instanceof ApiError && cause.status === 403) setError(tipo === "painel" ? "Este código é de um totem. Crie um dispositivo do tipo Painel de TV em Configurações." : "Este código é de um painel. Use um dispositivo do tipo Totem.");
      else setError("Não foi possível validar este dispositivo.");
    } finally { setLoading(false); }
  }
  return <div className="flex min-h-[70vh] items-center justify-center"><Card className="w-full max-w-lg"><CardHeader title="Pareie este dispositivo" description="Cole o código fornecido em Configurações > Totem e guichês." /><CardBody className="flex flex-col gap-4"><Input label="Código do dispositivo" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" /><Button size="lg" className="justify-center" disabled={!token.trim() || loading} loading={loading} onClick={() => void pair()}>Validar e parear</Button>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<p className="text-xs text-text-subtle">O código é armazenado somente neste navegador.</p></CardBody></Card></div>;
}

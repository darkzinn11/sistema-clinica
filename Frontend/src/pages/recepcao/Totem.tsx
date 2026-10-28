import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api/client";
import { PareamentoDispositivo } from "@/components/recepcao/PareamentoDispositivo";
import { clearDevice, loadDevice, type StoredDevice } from "@/lib/device/storage";
import { useGenerateTotemTicket, useTotemTypes } from "@/lib/api/recepcao";

function validCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) return false;
  let sum = 0; for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11; if (digit === 10) digit = 0; if (digit !== Number(cpf[9])) return false;
  sum = 0; for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11; if (digit === 10) digit = 0; return digit === Number(cpf[10]);
}

function formatCpf(value: string) { const digits = value.replace(/\D/g, "").slice(0, 11); return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }

export default function Totem() {
  const [device, setDevice] = useState<StoredDevice | null>(() => loadDevice("totem"));
  const [cpf, setCpf] = useState("");
  const [step, setStep] = useState<"cpf" | "tipo" | "resultado">("cpf");
  const [result, setResult] = useState<{ codigo: string; tipoNome: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const types = useTotemTypes(device?.token);
  const generate = useGenerateTotemTicket();

  useEffect(() => { const id = window.setTimeout(() => { setCpf(""); setStep("cpf"); setResult(null); setMessage(null); }, 60_000); return () => window.clearTimeout(id); }, [step, cpf, result]);
  useEffect(() => { if (types.error instanceof ApiError && types.error.status === 401) { clearDevice("totem"); setDevice(null); } }, [types.error]);

  if (!device) return <PareamentoDispositivo onPaired={setDevice} />;
  if (step === "resultado" && result) return <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg p-6 text-center"><BrandLogo className="h-14 w-auto" /><Card className="w-full max-w-2xl"><CardBody className="flex flex-col items-center gap-5 py-14"><p className="text-xl text-text-muted">Sua senha é</p><p className="font-display text-8xl font-semibold text-accent">{result.codigo}</p><p className="text-xl font-medium">{result.tipoNome}</p><p className="text-lg text-text-muted">Aguarde ser chamado no painel.</p></CardBody></Card></main>;
  return <main className="flex min-h-screen flex-col bg-bg p-6 text-text"><header className="flex items-center justify-between"><BrandLogo className="h-14 w-auto" /><Button variant="ghost" size="sm" onClick={() => { clearDevice("totem"); setDevice(null); }}>Trocar dispositivo</Button></header><div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 py-8">
    {step === "cpf" ? <Card><CardHeader title="Digite o CPF do paciente" description="O CPF é usado somente para vincular a senha depois do chamado. O totem não consulta o cadastro." /><CardBody className="flex flex-col items-center gap-6"><input aria-label="CPF do paciente" inputMode="numeric" autoFocus value={formatCpf(cpf)} onChange={(e) => { setCpf(e.target.value.replace(/\D/g, "").slice(0, 11)); setMessage(null); }} className="w-full rounded-xl border border-border bg-surface p-5 text-center font-display text-4xl tracking-widest outline-none focus:border-accent" placeholder="000.000.000-00" />{message && <p role="alert" className="text-danger">{message}</p>}<Button size="lg" className="w-full justify-center" disabled={cpf.length !== 11} onClick={() => { if (!validCpf(cpf)) { setMessage("CPF inválido, confira os números."); return; } setStep("tipo"); }}>Continuar</Button><Button variant="secondary" size="lg" className="w-full justify-center" onClick={() => { setCpf(""); setStep("tipo"); }}>Não tenho / não quero informar o CPF</Button></CardBody></Card> : <Card><CardHeader title="Escolha o atendimento" description="Selecione uma opção para retirar sua senha." /><CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">{types.isPending ? <p>Carregando opções…</p> : types.isError ? <EmptyState title="Não foi possível carregar os atendimentos" description={types.error.message} /> : (types.data ?? []).map((type) => <Button key={type.id} size="lg" variant={type.preferencial ? "primary" : "secondary"} className="min-h-24 justify-center text-lg" disabled={generate.isPending} onClick={() => { setMessage(null); generate.mutate({ tipoId: type.id, cpf: cpf || undefined, token: device.token }, { onSuccess: (value) => { setCpf(""); setResult(value); setStep("resultado"); window.setTimeout(() => { setResult(null); setStep("cpf"); }, 8_000); }, onError: (error) => setMessage(error instanceof ApiError && error.status === 429 ? "Aguarde um instante e tente de novo." : error instanceof ApiError ? error.message : "Não foi possível gerar a senha.") }); }}>{type.nome}{type.preferencial ? " · Preferencial" : ""}</Button>)}{message && <p role="alert" className="col-span-full text-center text-danger">{message}</p>}</CardBody></Card>}
  </div></main>;
}

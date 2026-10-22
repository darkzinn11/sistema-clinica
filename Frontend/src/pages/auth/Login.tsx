import { useState } from "react";
import { Building, Eye, EyeSlash, Lock, Sms } from "iconsax-reactjs";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiError } from "@/lib/api/client";
import { ClinicChoiceRequired, UnitChoiceRequired, useAuth } from "@/lib/auth/auth";
import type { ClinicOption, UnitOption } from "@/lib/auth/types";

/** Entra só com e-mail e senha. Se a pessoa tem mais de uma clínica ou unidade, o sistema pergunta depois de validar a senha. */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<ClinicOption[] | null>(null);
  const [clinicId, setClinicId] = useState<string | undefined>(undefined);
  const [units, setUnits] = useState<UnitOption[] | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? "/inicio";

  if (session) return <Navigate to={from} replace />;

  function reset() {
    setClinics(null);
    setClinicId(undefined);
    setUnits(null);
    setPassword("");
    setError(null);
  }

  async function enter(options: { clinicId?: string; unitId?: string } = {}) {
    setLoading(true);
    setError(null);
    try {
      await login({ email, senha: password, clinicaId: options.clinicId, unidadeId: options.unitId });
      navigate(from, { replace: true });
    } catch (e) {
      if (e instanceof ClinicChoiceRequired) {
        setClinics(e.clinics);
      } else if (e instanceof UnitChoiceRequired) {
        setClinics(null);
        setUnits(e.units);
      } else if (e instanceof ApiError && e.status === 401) {
        reset();
        setError("E-mail ou senha incorretos.");
      } else if (e instanceof ApiError && e.status === 429) {
        setError("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
      } else {
        setError(e instanceof ApiError ? e.message : "Não foi possível entrar. Tente de novo.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void enter();
  }

  if (clinics) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-text">Qual clínica?</h1>
            <p className="mt-1 text-base text-text-muted">Você tem acesso a mais de uma clínica. Escolha em qual vai entrar agora.</p>
          </div>
          <div className="flex flex-col gap-2">
            {clinics.map((c) => (
              <Button key={c.id} type="button" variant="secondary" size="lg" icon={Building} className="w-full justify-start" disabled={loading}
                onClick={() => { setClinicId(c.id); void enter({ clinicId: c.id }); }}>
                {c.nome}
              </Button>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="button" variant="ghost" size="sm" onClick={reset}>Voltar</Button>
        </div>
      </AuthShell>
    );
  }

  if (units) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-text">Qual unidade?</h1>
            <p className="mt-1 text-base text-text-muted">Você atende em mais de uma unidade. Escolha onde vai trabalhar agora.</p>
          </div>
          <div className="flex flex-col gap-2">
            {units.map((u) => (
              <Button key={u.id} type="button" variant="secondary" size="lg" icon={Building} className="w-full justify-start" disabled={loading}
                onClick={() => void enter({ clinicId, unitId: u.id })}>
                {u.nome}
              </Button>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="button" variant="ghost" size="sm" onClick={reset}>Voltar</Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Entrar</h1>
          <p className="mt-1 text-base text-text-muted">Acesse o painel da sua clínica.</p>
        </div>

        <Input
          label="E-mail"
          type="email"
          icon={Sms}
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <Input
            label="Senha"
            type={showPassword ? "text" : "password"}
            icon={Lock}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3 top-[34px] text-text-subtle hover:text-text"
          >
            {showPassword ? <EyeSlash size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  );
}

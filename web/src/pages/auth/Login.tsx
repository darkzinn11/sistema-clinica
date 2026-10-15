import { useEffect, useState } from "react";
import { Eye, EyeSlash, Lock, Sms } from "iconsax-reactjs";
import { useNavigate } from "react-router";
import { Input, Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ana.ribeiro@vidaplena.com.br");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Entrar · MultiSaúde";
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate("/inicio"), 500);
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
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
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
        </div>

        <div className="flex items-center justify-between gap-3">
          <Checkbox label="Lembrar de mim" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <Button type="button" variant="ghost" size="sm" className="px-1 text-accent hover:bg-transparent hover:underline" onClick={() => navigate("/esqueci-senha")}>
            Esqueci minha senha
          </Button>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  );
}

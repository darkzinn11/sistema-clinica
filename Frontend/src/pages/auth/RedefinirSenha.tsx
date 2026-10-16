import { useState } from "react";
import { Eye, EyeSlash, Lock } from "iconsax-reactjs";
import { useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthCenteredLayout } from "@/components/auth/auth-shell";
import { PasswordStrength } from "@/components/auth/password-strength";
import { passwordScore } from "@/components/auth/password-utils";

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = passwordScore(password) >= 4 && confirm === password && password.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => navigate("/inicio"), 500);
  }

  return (
    <AuthCenteredLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-text">Criar nova senha</h1>
          <p className="mt-1 text-base text-text-muted">Escolha uma senha forte para proteger sua conta.</p>
        </div>

        <div className="relative">
          <Input
            label="Nova senha"
            type={show ? "text" : "password"}
            icon={Lock}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-[34px] text-text-subtle hover:text-text">
            {show ? <EyeSlash size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </div>

        <PasswordStrength password={password} />

        <Input
          label="Confirmar nova senha"
          type={show ? "text" : "password"}
          icon={Lock}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "As senhas não coincidem." : undefined}
        />

        <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading} disabled={!canSubmit}>
          Salvar e entrar
        </Button>
      </form>
    </AuthCenteredLayout>
  );
}

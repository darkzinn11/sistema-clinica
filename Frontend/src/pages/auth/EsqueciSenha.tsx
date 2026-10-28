import { IconCircle } from "@/components/ui/icon-circle";
import { useState } from "react";
import { ArrowLeft, Sms, TickCircle } from "iconsax-reactjs";
import { Input } from "@/components/ui/input";
import { Button, ButtonLink } from "@/components/ui/button";
import { AuthCenteredLayout } from "@/components/auth/auth-shell";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  }

  return (
    <AuthCenteredLayout>
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <IconCircle tone="success" size="2xl">
            <TickCircle size={24} variant="Bold" aria-hidden />
          </IconCircle>
          <div>
            <h1 className="font-display text-xl font-semibold text-text">Enviamos um link para você</h1>
            <p className="mt-1 text-base text-text-muted">
              Se houver uma conta para <span className="font-medium text-text">{email}</span>, um e-mail com instruções de redefinição chega em alguns minutos.
            </p>
          </div>
          <ButtonLink to="/login" variant="secondary" size="sm" icon={ArrowLeft} className="mt-2 self-start">
            Voltar para o login
          </ButtonLink>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-xl font-semibold text-text">Esqueceu sua senha?</h1>
            <p className="mt-1 text-base text-text-muted">Informe seu e-mail de acesso e enviaremos um link para criar uma nova senha.</p>
          </div>
          <Input label="E-mail" type="email" icon={Sms} required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading}>
            Enviar link
          </Button>
          <ButtonLink to="/login" variant="secondary" size="sm" icon={ArrowLeft} className="self-center">
            Voltar para o login
          </ButtonLink>
        </form>
      )}
    </AuthCenteredLayout>
  );
}

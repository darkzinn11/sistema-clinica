"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-lg font-semibold text-text">Esqueci minha senha</h1>
        {state?.sent ? (
          <p className="text-base text-text">
            Se esse e-mail tiver uma conta, enviamos um link pra redefinir a senha.
          </p>
        ) : (
          <>
            <Input label="E-mail" type="email" name="email" required autoComplete="email" />
            {state?.error && (
              <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}
            <Button type="submit" loading={pending}>
              Enviar link
            </Button>
          </>
        )}
        <Link href="/login" className="text-center text-xs text-accent underline">
          Voltar pro login
        </Link>
      </form>
    </div>
  );
}

"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/agenda";
  const [state, formAction, pending] = useActionState(signInAction, undefined);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-lg font-semibold text-text">Entrar</h1>
        <input type="hidden" name="next" value={next} />
        <Input label="E-mail" type="email" name="email" required autoComplete="email" />
        <Input label="Senha" type="password" name="password" required autoComplete="current-password" />
        {state?.error && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" loading={pending}>
          Entrar
        </Button>
        <Link href="/esqueci-senha" className="text-center text-xs text-accent underline">
          Esqueci minha senha
        </Link>
      </form>
    </div>
  );
}

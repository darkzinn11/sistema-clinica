"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RedefinirSenhaPage() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, undefined);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-lg font-semibold text-text">Nova senha</h1>
        <Input label="Nova senha" type="password" name="password" required autoComplete="new-password" />
        <Input
          label="Confirmar nova senha"
          type="password"
          name="confirmPassword"
          required
          autoComplete="new-password"
        />
        {state?.error && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" loading={pending}>
          Salvar nova senha
        </Button>
      </form>
    </div>
  );
}

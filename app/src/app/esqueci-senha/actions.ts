"use server";

import { createClient } from "@/lib/supabase/server";

export async function requestPasswordResetAction(
  _prevState: { sent?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
  });

  if (error) {
    return { error: "Não foi possível enviar o e-mail. Tente de novo em alguns minutos." };
  }
  return { sent: true };
}

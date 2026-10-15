import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * O link de "esqueci minha senha" (e, se um dia tiver, magic link) do
 * Supabase volta pra cá com um `code` — troca por uma sessão antes de
 * mandar o usuário pra `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/agenda";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cliente ligado à sessão do usuário logado (via cookies) — RLS vale a
 * pena aqui, cada query já chega filtrada por `auth_clinic_id()`. Usar
 * dentro de Server Actions e Server Components, nunca em código que roda
 * no navegador.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // chamado de dentro de um Server Component sem resposta pra
            // escrever cookie — o middleware já cuida de renovar a sessão.
          }
        },
      },
    },
  );
}

/**
 * Cliente com a service role key — ignora RLS de propósito. Só pra rotas
 * públicas sem login (totem emitindo senha, painel de TV lendo a chamada
 * atual), nunca pra ações que um usuário comum dispara. Ver nota de
 * segurança na migration e em replica/backend.md.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

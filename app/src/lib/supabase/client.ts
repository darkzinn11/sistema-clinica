import { createBrowserClient } from "@supabase/ssr";

/**
 * Sem tipos gerados ainda — não tem projeto Supabase real pra gerar contra
 * (`supabase gen types typescript --linked`). Rodar esse comando depois de
 * criar o projeto e importar o resultado aqui restaura a tipagem forte nas
 * tabelas.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

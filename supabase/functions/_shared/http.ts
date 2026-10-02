// Comum às Edge Functions do app.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

// Sem cabeçalhos CORS de propósito: quem chama é o app (iOS/Android), que não
// passa por CORS. Assim nenhum site consegue usar as funções pelo navegador de
// alguém logado. Se um dia houver versão web, libere só o domínio dela.
const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

export const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS, ...extra } });

/** Corpo JSON com limite de tamanho; null se inválido ou grande demais. */
export async function readJson(req: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get('Content-Length') ?? 0);
  if (declared > maxBytes) return null;
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

/**
 * Cliente com o token de quem chamou (o banco aplica o RLS como essa pessoa)
 * e o usuário, conferido no servidor do Supabase. user null = sem login.
 */
export async function caller(req: Request): Promise<{ supabase: SupabaseClient; user: User | null } | null> {
  // Projetos antigos expõem SUPABASE_ANON_KEY; os de chaves novas podem expor
  // só a publishable. Qualquer uma serve: quem autentica é o token do usuário.
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!publicKey) {
    console.error('Nem SUPABASE_ANON_KEY nem SUPABASE_PUBLISHABLE_KEY disponíveis na função.');
    return null;
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, publicKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

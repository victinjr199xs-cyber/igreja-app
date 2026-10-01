// Funções puras da conta, sem dependência de módulos nativos (testáveis).

// Nome e foto escolhidos no app ficam em display_name/photo_url: o Supabase
// regrava name/avatar_url com os dados do Google a cada login, e apagaria o
// que a pessoa escolheu. name/avatar_url seguem como reserva (contas antigas
// e o que veio do Google). photo_url null = a pessoa removeu a foto.
type Metadata = Record<string, unknown> | undefined;

export function nameFromMetadata(meta: Metadata): string {
  const pick = (k: string) => (typeof meta?.[k] === 'string' ? (meta[k] as string) : '');
  return pick('display_name') || pick('name') || pick('full_name');
}

export function photoFromMetadata(meta: Metadata): string | null {
  const url = meta && 'photo_url' in meta ? meta.photo_url : meta?.avatar_url;
  return typeof url === 'string' && url ? url : null;
}

/** Lê `code` ou `error` da URL de retorno do login (query ou fragmento). */
export function parseAuthCallback(url: string): { code?: string; error?: string } {
  const start = url.search(/[?#]/);
  if (start < 0) return {};
  const params: Record<string, string> = {};
  for (const pair of url.slice(start + 1).split(/[&#?]/)) {
    const [key, value = ''] = pair.split('=');
    if (!key) continue;
    try {
      params[key] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      params[key] = value;
    }
  }
  return {
    code: params.code || undefined,
    error: params.error_description || params.error || undefined,
  };
}

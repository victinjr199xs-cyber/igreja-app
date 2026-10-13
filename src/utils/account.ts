// Funções puras da conta, sem dependência de módulos nativos (testáveis).

/**
 * Regra da senha nova. Deve bater com Supabase › Authentication › Providers ›
 * Email (mínimo 8, "Letters and digits"; docs/SUPABASE.md). Senhas antigas
 * mais fracas continuam entrando: vale para criar e trocar.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_RULE = `mín. ${MIN_PASSWORD_LENGTH} caracteres, com letras e números`;

export function isStrongPassword(password: string): boolean {
  // Faixa explícita (A–Z e acentuadas) em vez de \p{L}: sem depender de
  // recurso de expressão regular que o motor do celular pode não ter.
  return (
    password.length >= MIN_PASSWORD_LENGTH && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(password) && /\d/.test(password)
  );
}

// Nome e foto ficam em display_name/photo_url (contas criadas desde a versão
// 1.1). name/avatar_url são o formato das contas mais antigas e seguem como
// reserva. photo_url null = a pessoa removeu a foto.
type Metadata = Record<string, unknown> | undefined;

export function nameFromMetadata(meta: Metadata): string {
  const pick = (k: string) => (typeof meta?.[k] === 'string' ? (meta[k] as string) : '');
  return pick('display_name') || pick('name');
}

export function photoFromMetadata(meta: Metadata): string | null {
  const url = meta && 'photo_url' in meta ? meta.photo_url : meta?.avatar_url;
  return typeof url === 'string' && url ? url : null;
}

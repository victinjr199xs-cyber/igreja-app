// Edge Function "youtube" (Supabase, Deno).
//
// Intermediário da YouTube Data API: a chave fica só aqui, como segredo, e
// não existe mais dentro do app (quem abrir o APK não tem o que copiar).
// Só atende quem está logado e só repassa as consultas que o app faz, com os
// parâmetros conferidos um a um: ninguém usa a função para gastar a cota com
// outras buscas.
//
// Segredo (Edge Functions › Secrets):
//   YOUTUBE_API_KEY   chave do Google Cloud restrita à "YouTube Data API v3"
// Como publicar: docs/SUPABASE.md, seção "Vídeos do YouTube".

import { caller, json, readJson } from '../_shared/http.ts';

const API = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_ID = 'UCp8El__iNcoGDlD4Lt9h-hg';

type Check = (value: string) => boolean;

const maxResults: Check = (v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 50;
const pageToken: Check = (v) => /^[\w-]{1,100}$/.test(v);
const videoIds: Check = (v) => {
  const ids = v.split(',');
  return ids.length >= 1 && ids.length <= 50 && ids.every((id) => /^[\w-]{6,20}$/.test(id));
};

// Exatamente o que src/services/youtubeService.ts pede. Parâmetro fora da
// lista ou com valor fora do formato = recusado.
const ALLOWED: Record<string, { required: string[]; checks: Record<string, Check> }> = {
  playlistItems: {
    required: ['part', 'playlistId'],
    checks: {
      part: (v) => v === 'contentDetails',
      // Playlists do canal (PL...) e a de uploads (UU + id do canal).
      playlistId: (v) => /^PL[\w-]{10,64}$/.test(v) || v === 'UU' + CHANNEL_ID.slice(2),
      maxResults,
      pageToken,
    },
  },
  videos: {
    required: ['part', 'id'],
    checks: { part: (v) => v === 'snippet,contentDetails', id: videoIds },
  },
  playlists: {
    required: ['part', 'channelId'],
    checks: {
      part: (v) => v === 'snippet,contentDetails',
      channelId: (v) => v === CHANNEL_ID,
      maxResults,
      pageToken,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const who = await caller(req);
  if (!who) return json(500, { error: 'misconfigured' });
  if (!who.user) return json(401, { error: 'not_authenticated' });

  const key = Deno.env.get('YOUTUBE_API_KEY');
  if (!key) {
    console.error('Segredo YOUTUBE_API_KEY não configurado.');
    return json(500, { error: 'misconfigured' });
  }

  const body = await readJson(req, 4_000);
  if (!body) return json(400, { error: 'invalid_body' });

  const path = String(body.path ?? '');
  const rule = Object.hasOwn(ALLOWED, path) ? ALLOWED[path] : undefined;
  const params = body.params;
  if (!rule || !params || typeof params !== 'object' || Array.isArray(params)) {
    return json(400, { error: 'not_allowed' });
  }

  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params as Record<string, unknown>)) {
    const check = Object.hasOwn(rule.checks, name) ? rule.checks[name] : undefined;
    if (!check || typeof value !== 'string' || !check(value)) return json(400, { error: 'not_allowed', param: name });
    query.set(name, value);
  }
  if (!rule.required.every((name) => query.has(name))) return json(400, { error: 'not_allowed' });
  query.set('key', key);

  let res: Response;
  try {
    res = await fetch(`${API}/${path}?${query}`);
  } catch (e) {
    console.error('YouTube fora do ar:', e);
    return json(502, { error: 'upstream_unavailable' });
  }
  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    // Só o motivo resumido: o texto do Google pode citar a chave ou o projeto.
    const reason = data?.error?.errors?.[0]?.reason ?? 'unknown';
    console.error('YouTube respondeu', res.status, reason);
    return json(res.ok ? 502 : res.status, { error: { message: `YouTube: ${reason}`, errors: [{ reason }] } });
  }

  return json(200, data);
});

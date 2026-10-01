// Edge Function "send-feedback" (Supabase, Deno).
//
// Recebe a avaliação do app, grava na tabela app_feedback com a identidade de
// quem está logado e manda um e-mail para a igreja pelo Gmail.
// Como publicar e configurar: docs/SUPABASE.md, seção "Avaliações do app".
//
// Segredos (Edge Functions › Secrets):
//   FEEDBACK_TO         e-mail que recebe as avaliações
//   FEEDBACK_SMTP_USER  Gmail que envia (o mesmo do login serve)
//   FEEDBACK_SMTP_PASS  senha de app desse Gmail (16 letras)

import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

// Sem cabeçalhos CORS de propósito: quem chama é o app (iOS/Android), que não
// passa por CORS. Assim nenhum site consegue usar a função pelo navegador de
// alguém logado. Se um dia houver versão web, libere só o domínio dela aqui.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LIKED_OPTIONS = new Set([
  'Pregações',
  'Rádio',
  'Bíblia',
  'Programação',
  'Visual',
  'Facilidade de uso',
  'Notificações',
]);

const LABELS = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Cliente com o token de quem chamou: o insert passa pelo RLS como esse
  // usuário, e ninguém consegue avaliar em nome de outro.
  // Projetos antigos expõem SUPABASE_ANON_KEY; os de chaves novas podem expor
  // só a publishable. Qualquer uma serve: quem autentica é o token do usuário.
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!publicKey) {
    console.error('Nem SUPABASE_ANON_KEY nem SUPABASE_PUBLISHABLE_KEY disponíveis na função.');
    return json(500, { error: 'misconfigured' });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, publicKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, { error: 'not_authenticated' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  // Tudo vem do app, então tudo é validado aqui.
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json(400, { error: 'invalid_rating' });
  const liked = (Array.isArray(body.liked) ? body.liked : [])
    .filter((x): x is string => typeof x === 'string' && LIKED_OPTIONS.has(x))
    .slice(0, 10);
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) : '';
  const allowReply = body.allowReply === true;
  const appVersion = String(body.appVersion ?? '').slice(0, 20);
  const platform = String(body.platform ?? '').slice(0, 40);
  const device = String(body.device ?? '').slice(0, 80);

  // Uma avaliação por minuto por pessoa, contra toques repetidos.
  const { data: recent } = await supabase
    .from('app_feedback')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())
    .limit(1);
  if (recent && recent.length > 0) return json(429, { error: 'too_many' });

  const { error: insertError } = await supabase.from('app_feedback').insert({
    user_id: user.id,
    rating,
    liked,
    comment: comment || null,
    allow_reply: allowReply,
    app_version: appVersion,
    platform,
    device,
  });
  if (insertError) return json(500, { error: 'insert_failed', detail: insertError.message });

  // O e-mail é um aviso: se falhar, a avaliação já está salva na tabela.
  let emailed = false;
  try {
    // Mesma ordem do app (nameFromMetadata em AuthContext.tsx).
    const meta = user.user_metadata ?? {};
    const name = String(meta.display_name || meta.name || meta.full_name || '').trim() || 'Sem nome';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const transport = nodemailer.createTransport({
      // Porta 465 (TLS direto): as Edge Functions bloqueiam 25 e 587.
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: Deno.env.get('FEEDBACK_SMTP_USER'),
        pass: Deno.env.get('FEEDBACK_SMTP_PASS'),
      },
    });
    await transport.sendMail({
      from: `"App Casa de Adoração" <${Deno.env.get('FEEDBACK_SMTP_USER')}>`,
      to: Deno.env.get('FEEDBACK_TO'),
      // Com permissão, "Responder" vai direto para a pessoa.
      ...(allowReply && user.email ? { replyTo: user.email } : {}),
      subject: `${stars} Nova avaliação do app (${rating}/5)`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px">
          <h2 style="color:#823030;margin-bottom:4px">Nova avaliação do app</h2>
          <p style="font-size:28px;color:#B08D57;margin:8px 0">${stars}</p>
          <p><b>Nota:</b> ${rating}/5 — ${LABELS[rating]}</p>
          ${liked.length ? `<p><b>Gostou de:</b> ${liked.map(escape).join(', ')}</p>` : ''}
          <p><b>Comentário:</b></p>
          <blockquote style="border-left:4px solid #823030;margin:0;padding:8px 12px;background:#f5f2f1">
            ${comment ? escape(comment).replace(/\n/g, '<br>') : '<i>Sem comentário</i>'}
          </blockquote>
          <hr style="border:none;border-top:1px solid #ddd;margin:20px 0">
          <p style="color:#666;font-size:13px">
            <b>${escape(name)}</b>${allowReply && user.email ? ` · ${escape(user.email)} (aceita resposta)` : ' · não pediu resposta'}<br>
            App ${escape(appVersion)} · ${escape(platform)} · ${escape(device)}
          </p>
        </div>`,
    });
    emailed = true;
  } catch (e) {
    console.error('Falha ao enviar e-mail da avaliação:', e);
  }

  return json(200, { ok: true, emailed });
});

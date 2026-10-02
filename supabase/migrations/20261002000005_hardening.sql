-- Endurecimento de segurança (auditoria de 02/10/2026).
-- Idempotente: pode rodar de novo sem erro.
--
-- 1. Colunas protegidas: o app só escolhe o conteúdo. Quem é o autor e quando
--    foi enviado o banco preenche sozinho (nada de "mass assignment").
-- 2. Limites no próprio banco: valem mesmo para quem chamar a API direto,
--    sem passar pelo app ou pela função.
-- 3. Foto de perfil: um arquivo só por pessoa, com nome fixo.

-- ─── Avaliações ──────────────────────────────────────────────────────────────

-- O Supabase dá todos os privilégios nas tabelas novas para anon/authenticated;
-- o RLS filtra as linhas, mas não as colunas. Aqui, as colunas.
revoke all on public.app_feedback from anon, authenticated;
grant select on public.app_feedback to authenticated;
grant insert (rating, liked, comment, allow_reply, app_version, platform, device)
  on public.app_feedback to authenticated;

alter table public.app_feedback drop constraint if exists app_feedback_sizes;
alter table public.app_feedback add constraint app_feedback_sizes check (
  coalesce(array_length(liked, 1), 0) <= 10
  and char_length(coalesce(app_version, '')) <= 20
  and char_length(coalesce(platform, '')) <= 40
  and char_length(coalesce(device, '')) <= 80
);

create or replace function public.app_feedback_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Autor e data sempre do servidor.
  new.user_id := auth.uid();
  new.created_at := now();
  if new.user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  -- 1 por minuto e 10 por dia por pessoa.
  if exists (
    select 1 from public.app_feedback
    where user_id = new.user_id and created_at > now() - interval '1 minute'
  ) or (
    select count(*) from public.app_feedback
    where user_id = new.user_id and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.app_feedback_guard() from public, anon, authenticated;

drop trigger if exists app_feedback_guard on public.app_feedback;
create trigger app_feedback_guard
  before insert on public.app_feedback
  for each row execute function public.app_feedback_guard();

-- ─── Erros do app ────────────────────────────────────────────────────────────

revoke all on public.app_errors from anon, authenticated;
grant insert (context, message, stack, extra, app_version, platform, device)
  on public.app_errors to anon, authenticated;

create or replace function public.app_errors_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent int;
begin
  new.user_id := auth.uid();
  new.created_at := now();
  -- Contra robôs enchendo o banco: 30 erros a cada 10 min por pessoa logada;
  -- sem login, 300 a cada 10 min somados (o app manda no máximo 20 por sessão).
  if new.user_id is not null then
    select count(*) into recent from public.app_errors
    where user_id = new.user_id and created_at > now() - interval '10 minutes';
    if recent >= 30 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  else
    select count(*) into recent from public.app_errors
    where user_id is null and created_at > now() - interval '10 minutes';
    if recent >= 300 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.app_errors_guard() from public, anon, authenticated;

drop trigger if exists app_errors_guard on public.app_errors;
create trigger app_errors_guard
  before insert on public.app_errors
  for each row execute function public.app_errors_guard();

create index if not exists app_errors_user_created_idx on public.app_errors (user_id, created_at desc);

-- ─── Fotos de perfil ─────────────────────────────────────────────────────────

-- Antes: qualquer arquivo dentro da própria pasta (dava para guardar centenas).
-- Agora: só <id>/avatar.jpg, que é o que o app grava.
drop policy if exists "avatars: dono envia" on storage.objects;
create policy "avatars: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');

drop policy if exists "avatars: dono troca" on storage.objects;
create policy "avatars: dono troca" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg')
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');

-- Só JPEG: o app sempre converte a foto para JPEG antes de enviar.
update storage.buckets
  set allowed_mime_types = array['image/jpeg'], file_size_limit = 1048576
  where id = 'avatars';

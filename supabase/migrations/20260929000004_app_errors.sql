-- Monitoramento de erros do app (src/services/errorReporter.ts), sem serviço
-- de terceiros. Veja em Table Editor › app_errors.
-- Idempotente: pode rodar de novo sem erro.

create table if not exists public.app_errors (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  -- Erros podem acontecer antes do login: usuário opcional.
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  context     text not null check (char_length(context) <= 60),
  message     text not null check (char_length(message) <= 500),
  stack       text check (char_length(stack) <= 2000),
  extra       jsonb check (pg_column_size(extra) <= 4000),
  app_version text check (char_length(app_version) <= 20),
  platform    text check (char_length(platform) <= 40),
  device      text check (char_length(device) <= 80)
);

alter table public.app_errors enable row level security;

-- O app só grava; ninguém lê pela API (o painel ignora o RLS). Quem está
-- logado não pode registrar erro em nome de outra pessoa.
drop policy if exists "errors: app registra" on public.app_errors;
create policy "errors: app registra" on public.app_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

create index if not exists app_errors_created_idx on public.app_errors (created_at desc);

-- Retenção: apaga erros com mais de 90 dias. Rode quando quiser, ou agende
-- em Integrations › Cron:  select public.purge_old_app_errors();
create or replace function public.purge_old_app_errors()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.app_errors where created_at < now() - interval '90 days';
$$;

revoke all on function public.purge_old_app_errors() from public, anon, authenticated;

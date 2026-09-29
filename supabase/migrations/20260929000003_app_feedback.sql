-- Avaliações do app (tela Avaliar o aplicativo → Edge Function send-feedback).
-- Idempotente: pode rodar de novo sem erro.

create table if not exists public.app_feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users (id) on delete set null default auth.uid(),
  rating      smallint not null check (rating between 1 and 5),
  liked       text[] not null default '{}',
  comment     text check (char_length(comment) <= 2000),
  allow_reply boolean not null default false,
  app_version text,
  platform    text,
  device      text
);

alter table public.app_feedback enable row level security;

-- Cada pessoa só grava em nome próprio...
drop policy if exists "feedback: envia a própria" on public.app_feedback;
create policy "feedback: envia a própria" on public.app_feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ...e só enxerga as próprias (a função usa isso para barrar envios repetidos).
drop policy if exists "feedback: lê as próprias" on public.app_feedback;
create policy "feedback: lê as próprias" on public.app_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

create index if not exists app_feedback_user_created_idx
  on public.app_feedback (user_id, created_at desc);

-- Ping semanal: o plano gratuito do Supabase pausa o projeto depois de 7 dias
-- sem atividade. A rotina .github/workflows/supabase-ping.yml chama esta
-- função a cada 3 dias, o que faz o banco trabalhar de verdade.
-- Idempotente: pode rodar de novo sem erro.
--
-- Não lê nem grava nada, não é SECURITY DEFINER e só devolve a hora do
-- servidor: pode ficar aberta para quem tem a chave pública.

create or replace function public.ping()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select now();
$$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

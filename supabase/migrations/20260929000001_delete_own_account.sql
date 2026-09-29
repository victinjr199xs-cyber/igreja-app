-- Exclusão da própria conta (exigência da Apple para apps com cadastro).
-- Idempotente: pode rodar de novo sem erro.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
-- Obrigatório em security definer: sem isso a função pode ser sequestrada
-- por um objeto de mesmo nome em outro schema.
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

# Login — configuração do Supabase

O app exige conta para entrar. As contas ficam no [Supabase](https://supabase.com)
(plano gratuito: até 50 mil usuários ativos por mês). Entrada por **e-mail e
senha**, com confirmação por **código de 6 dígitos** enviado por e-mail — tanto
no cadastro quanto no "esqueci minha senha". Sem links: tudo acontece dentro do
app, e funciona no Expo Go.

## 1. Criar o projeto

1. Crie uma conta em https://supabase.com e clique em **New project**.
2. Nome: `casa-de-adoracao`. Região: **South America (São Paulo)**. Guarde a
   senha do banco num lugar seguro.
3. Em **Project Settings › API**, copie:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Cole no `.env` do projeto (veja `.env.example`) e reinicie o Expo com
   `npx expo start -c`.

> A chave **anon** é pública por natureza (vai dentro do app). **Nunca** coloque
> a `service_role` no app.

## 2. Código de 6 dígitos nos e-mails

Em **Authentication › Emails › Templates**, troque o corpo de dois modelos:

**Confirm signup** — assunto `Seu código de confirmação`:

```html
<h2>Bem-vindo à Casa de Adoração!</h2>
<p>Use este código no app para confirmar seu e-mail:</p>
<h1 style="letter-spacing:6px">{{ .Token }}</h1>
<p>Se você não criou uma conta, ignore este e-mail.</p>
```

**Reset password** — assunto `Código para redefinir sua senha`:

```html
<h2>Redefinição de senha</h2>
<p>Use este código no app para criar uma nova senha:</p>
<h1 style="letter-spacing:6px">{{ .Token }}</h1>
<p>Se não foi você que pediu, ignore este e-mail.</p>
```

Confira em **Authentication › Providers › Email** que **Confirm email** está
ligado e que o tamanho do código (Email OTP Length) é **6**.

## 3. Excluir conta (exigência da Apple)

Em **SQL Editor**, rode uma vez:

```sql
-- Deixa cada usuário apagar a própria conta, e só a própria.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
```

O botão **Configurações › Conta › Excluir conta** chama essa função.

## 4. Antes de publicar: e-mail próprio

O envio de e-mails embutido do Supabase tem limite baixo (poucos por hora) e
serve só para testes. Para produção, configure um SMTP em **Project Settings ›
Authentication › SMTP Settings** — por exemplo [Resend](https://resend.com) ou
[Brevo](https://www.brevo.com), ambos com plano gratuito — usando um remetente
como `nao-responda@casadeadoracao.com.br`.

## 5. Build

O `.env` não vai para o build do EAS. Cadastre as duas variáveis lá também:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment production --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key> --environment production --environment preview --visibility plaintext
```

## Sem configuração

Enquanto as variáveis não existirem, entrar ou criar conta mostra "O login
ainda não foi configurado neste app" e, **só em modo de desenvolvimento**,
aparece um link para continuar sem login. Em build de
produção esse atalho não aparece.

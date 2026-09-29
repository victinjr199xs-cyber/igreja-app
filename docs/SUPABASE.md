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
   - **Publishable key** (`sb_publishable_…`) — ou, em projetos antigos, a
     **anon public** (`eyJ…`) → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
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

> O `set search_path = ''` é obrigatório: função `security definer` sem ele
> pode ser sequestrada por quem criar um objeto com o mesmo nome em outro
> schema. O **Security Advisor** do Supabase aponta isso como
> *function_search_path_mutable*.

## Fotos de perfil (Storage)

A foto de perfil fica no bucket público `avatars`, em `<id do usuário>/avatar.jpg`
(512×512, ~50 KB). O endereço dela vai em `user_metadata.avatar_url`. Rode uma
vez no **SQL Editor**:

```sql
-- Bucket público: qualquer um vê a foto pelo link (o nome da pasta é o id
-- aleatório do usuário). Até 1 MB, só JPEG/PNG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Cada usuário só mexe na própria pasta. O upload com upsert exige
-- select + insert + update.
create policy "avatars: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono troca" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

Ao **excluir a conta**, o app apaga a foto pela API do Storage antes de chamar
`delete_own_account` (o Supabase não permite apagar arquivos por SQL).

## Avaliações do app

**Configurações › Sua opinião › Avaliar o aplicativo** envia nota (1–5),
o que a pessoa mais gosta e um comentário. O caminho:

```
app → Edge Function send-feedback → tabela app_feedback  (histórico)
                                  → e-mail pelo Gmail    (aviso para a igreja)
```

A senha do Gmail fica só nos segredos do Supabase, nunca no app.

### 1. Tabela (SQL Editor)

```sql
create table public.app_feedback (
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
create policy "feedback: envia a própria" on public.app_feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ...e só enxerga as próprias (a função usa isso para barrar envios repetidos).
create policy "feedback: lê as próprias" on public.app_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));
```

Você vê **todas** as avaliações em **Table Editor › app_feedback** (o painel
ignora o RLS). Quem excluir a conta tem a avaliação mantida, sem o vínculo.

### 2. Publicar a função

Pelo painel: **Edge Functions › Deploy a new function › Via Editor**.
- Nome: `send-feedback`
- Cole o conteúdo de `supabase/functions/send-feedback/index.ts` e clique em
  **Deploy function**.
- Deixe **Verify JWT** ligado (só quem está logado consegue enviar).

(Pela linha de comando, se preferir: `npx supabase login`,
`npx supabase link --project-ref ufiebjhckkmdyrfnbxka` e
`npx supabase functions deploy send-feedback`.)

### 3. Segredos

Em **Edge Functions › Secrets**, adicione:

| Nome | Valor |
|---|---|
| `FEEDBACK_TO` | e-mail que vai receber as avaliações |
| `FEEDBACK_SMTP_USER` | o Gmail que envia (o mesmo do login serve) |
| `FEEDBACK_SMTP_PASS` | a senha de app de 16 letras desse Gmail |

A função usa a porta 465 do Gmail: as Edge Functions bloqueiam 25 e 587.
Se o e-mail falhar, a avaliação continua salva na tabela; o erro aparece em
**Edge Functions › send-feedback › Logs**.

## Tabelas e políticas (RLS)

O app usa o Auth, o Storage (fotos) e a tabela `app_feedback` (avaliações),
todos com as políticas acima. Quando algo for guardado no banco (pedidos de oração, inscrições…),
toda tabela nova precisa de **Row Level Security ligada** e de políticas que
limitem cada usuário às próprias linhas — sem isso, a chave pública do app lê
a tabela inteira.

## 4. Envio dos e-mails (SMTP)

Os cadastros ficam só no Supabase (**Authentication › Users**). Mas o envio de
e-mails embutido do Supabase **só entrega para a equipe do projeto** e tem
limite de poucos por hora: para qualquer pessoa receber o código, o Supabase
precisa de um SMTP — um "carteiro", que só transporta o e-mail.

### Opção recomendada: Gmail (grátis, sem domínio)

1. Use um Gmail da igreja (ex.: `casadeadoracao.app@gmail.com`).
2. Nele, ative a **Verificação em duas etapas** (myaccount.google.com › Segurança).
3. Gere uma **Senha de app** em https://myaccount.google.com/apppasswords
   (nome: `Supabase`) e copie as 16 letras.
4. Em **Project Settings › Authentication › SMTP Settings**, ligue
   **Enable custom SMTP** e preencha:

   | Campo | Valor |
   |---|---|
   | Sender email | o Gmail |
   | Sender name | `Casa de Adoração` |
   | Host | `smtp.gmail.com` |
   | Port | `587` |
   | Username | o Gmail completo |
   | Password | a senha de app (não a senha normal) |

5. Em **Authentication › Rate Limits**, ajuste *emails sent per hour* (ex.: 100).
6. Teste criando conta com um e-mail que **não** seja da equipe do projeto.

O Gmail aceita cerca de 500 envios por dia — muito acima do uso da igreja.
Se o código não chegar, veja **Logs › Auth** no painel e a pasta de spam.

### Alternativas

- [Brevo](https://www.brevo.com): grátis até 300/dia, aceita remetente
  verificado sem domínio próprio.
- [Resend](https://resend.com): exige **domínio verificado** para entregar a
  qualquer pessoa.

> **Resend em modo de teste** (remetente `onboarding@resend.dev`, sem domínio
> verificado) só entrega e-mails **para o endereço dono da conta Resend**.
> Qualquer outra pessoa que se cadastrar não recebe o código e fica presa na
> tela de confirmação. Verifique um domínio no Resend antes de liberar o app.

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

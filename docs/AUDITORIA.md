# Auditoria do projeto — 29/09/2026

Skills usadas: `code-reviewer`, `senior-security` (STRIDE + varredura de
segredos), `dependency-auditor`, `tech-debt-tracker`, `ship-gate`. Os scripts
dessas skills são em Python, que não está instalado nesta máquina; as regras
delas foram aplicadas com grep/Node, `npm audit` e testes HTTP contra o
Supabase de produção usando só a chave pública (como um atacante faria).

## Corrigido nesta auditoria

| Item | Severidade | Correção |
|---|---|---|
| Sair/excluir conta deixava histórico de vídeos, último capítulo e última rádio no aparelho: o próximo usuário do mesmo celular via o "continue de onde parou" do anterior | Alta (privacidade) | `AuthContext` apaga `yt:history`, `yt:progress`, `bible:last`, `radio:last` ao sair e ao excluir |
| Sem error boundary: erro ao desenhar qualquer tela fechava o app ou deixava a tela branca | Alta (ship-gate CODE-09) | `src/components/ErrorBoundary.tsx` na raiz, com "Tentar novamente" |

## Verificado e aprovado

- Nenhum segredo no código nem no histórico do git; `.env` nunca commitado.
- Anônimo não lista fotos (`avatars` retorna `[]`) nem chama `delete_own_account` (42501).
- Upload de foto: bucket limita 1 MB e JPEG/PNG; app reduz para 512 px.
- TypeScript `strict`, lockfile versionado, sem versões curinga nem dependências por URL/git, sem scripts de instalação suspeitos.
- Sem `console.log`, `@ts-ignore`, `eslint-disable` ou TODO esquecidos.
- Licenças: 97% permissivas; os dois pacotes com GPL têm licença dupla (MIT/BSD). Fontes Fira: OFL, pode embutir.

## Segunda rodada — 30/09/2026: correções

| Pendência | Situação |
|---|---|
| 4. Zero testes | **Resolvido**: Jest (`jest-expo`), 64 testes em 6 arquivos — datas, programação, eventos especiais, Pix (inclusive o exemplo oficial do Banco Central), conteúdo online, histórico do YouTube, Bíblia e os 484 versículos. `npm test` |
| 5. SQL só na documentação | **Resolvido**: `supabase/migrations/`, 4 arquivos idempotentes |
| 6. Sem monitoramento de erros | **Resolvido** sem terceiros: tabela `app_errors` + `errorReporter` (tela quebrada, erro global, cota do YouTube, JSON de avisos inválido, foto, avaliação) |
| 8. Código duplicado | **Resolvido**: `src/utils/format.ts`, `SectionHeader` compartilhado, links só em `CHURCH_INFO` |
| 9. Arquivos grandes | **Reduzido**: Pregações 1276 → 935 linhas (`VideoRow`, `VideoPlayerModal` extraídos), Início 891 → ~800, Programação 591 → ~540 |
| 10. Erros silenciados | **Resolvido** onde importa: vão para `app_errors`; os que restam são cache/best-effort, comentados |
| 12. CORS `*` na função | **Resolvido**: sem cabeçalhos CORS (só o app chama) |
| `any` no conteúdo online | **Resolvido**: `unknown` + validação em `contentParser.ts`; links só `https` |
| Senha mínima 6 | **App pronto** (pede 8); falta ajustar no painel do Supabase |
| Token de push falhando no Android | **Resolvido**: desligado até existir push remoto |

Encontrado e corrigido pelos testes: evento especial com id duplicado no
arquivo online aparecia duas vezes no calendário.

Ainda dependem de acesso às contas (não há como fazer pelo código):
itens 1, 2 e 3 abaixo, e aplicar as migrações 3 e 4. Item 7 (backups) segue
aceito no plano gratuito. Item 11 (`npm audit`) segue aguardando o Expo.

## Terceira rodada — 02/10/2026: checklist de 20 itens, proteção máxima

Testes ao vivo só com a chave pública: excluir conta sem login → 42501, lista
de tabelas → 401, fotos/buckets → `[]`, `auth.users` invisível, http não
entrega dados. Histórico do git sem segredos. 79 testes passando.

| Achado | Correção |
|---|---|
| Chave do YouTube dentro do APK, sem restrição (funcionou de fora) | Função `youtube` no servidor guarda a chave; o app não tem mais chave. Parâmetros conferidos um a um, só com login |
| Sessão (tokens) em texto puro no AsyncStorage | `encryptedStorage.ts`: AES-256, chave nova a cada gravação no Keychain/Keystore, só neste aparelho. Sessões antigas migram sem deslogar |
| Backup do Android copiava os dados do app | `android.allowBackup: false` |
| Avaliação: dava para escolher autor/data e pular o limite gravando direto na API | Permissão só nas colunas de conteúdo; trigger força autor e data; limite 1/min e 10/dia no banco |
| Tabela de erros aceitava gravação sem limite (robô enchendo o banco) | Mesmas travas de coluna; limite 30/10 min por pessoa e 300/10 min sem login |
| Foto: cabiam infinitos arquivos na própria pasta | Só `<id>/avatar.jpg`, só JPEG, 1 MB |
| Senha: só tamanho | 8+ com letras e números, no app (e no painel, a fazer) |
| Função devolvia mensagem interna do banco | Só o código do erro; detalhe vai para o log |
| Funções sem limite de tamanho do pedido | 4 KB (`youtube`) e 16 KB (`send-feedback`); cabeçalho `nosniff` |
| `exp://**` liberado nos retornos de login | Documentado: só `casadeadoracao://**` fixo |

Ficou de fora, de propósito:
- **CAPTCHA** no cadastro: exige conta Cloudflare e um passo a mais na tela
  de entrada. O cadastro já exige o código do e-mail e o Supabase limita
  envios. Reavaliar se aparecer conta falsa.
- **Assinatura das atualizações OTA** (code signing): exige plano pago do EAS.
- `npm audit`: 5 altos (`node-forge`) e 9 moderados (`uuid`), todos em
  ferramentas de build do Expo, fora do app. Aguardar o Expo; **não** usar
  `--force`.

## Pendências da primeira rodada (por prioridade)

### Alta — resolver antes de ampliar a distribuição

1. **Avaliações não funcionam no APK distribuído**: tabela `app_feedback` e
   função `send-feedback` não existem no Supabase (HTTP 404). Seguir
   `docs/SUPABASE.md`, seção "Avaliações do app".
2. **Chave do YouTube sem restrição**, e agora dentro de um APK público. Em
   Google Cloud › Credenciais: restringir à YouTube Data API v3 e a apps
   Android `com.casadeadoracao.app` + SHA-1 (EAS › Credentials). Manter uma
   segunda chave sem restrição de app para o Expo Go.
3. **Senha mínima de 6 caracteres**. Supabase › Authentication › Providers ›
   Email: subir para 8.

### Média

4. **Zero testes automatizados**. Candidatos óbvios, funções puras:
   `getNextEvent`/`eventsOn`, `buildPixPayload`/`crc16`, `parseDuration`,
   `verseOfDay`, `parse` do conteúdo online. (Hoje só testados manualmente.)
5. **SQL só na documentação** (ship-gate DB-06): mover para
   `supabase/migrations/` para recriar o banco com um comando.
6. **Sem monitoramento de erros** (OBS-01): erros dos testadores não chegam a
   ninguém. Sugestão: Sentry (`sentry-expo`, plano gratuito).
7. **Backups**: o plano gratuito do Supabase não oferece backup restaurável.
   Hoje o risco é baixo (contas e fotos); reavaliar se o banco crescer.

### Baixa — dívida técnica

8. Formatação de data/hora duplicada em Home, Pregações e Programação; links
   do Instagram/YouTube/privacidade repetidos em vez de `CHURCH_INFO`.
9. Arquivos grandes: `SermonsScreen.tsx` (1276 linhas), `HomeScreen.tsx` (891).
10. 23 erros silenciados com `.catch(() => {})` — a maioria intencional
    (cache), mas sem monitoramento nenhum deles aparece.
11. 11 vulnerabilidades "moderadas" do `npm audit`: todas de `uuid` dentro de
    ferramentas de build do Expo (não vão para o app). **Não** rodar
    `npm audit fix --force` — ele rebaixaria o Expo para a versão 46.
    Aguardar correção do Expo.
12. CORS `*` na Edge Function: aceitável (app móvel, exige login), revisar se
    um dia houver versão web.

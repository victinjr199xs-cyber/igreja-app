# Igreja App

Aplicativo mobile para igreja, construído com Expo e React Native. Reúne a
programação semanal, o acervo de pregações, uma rádio cristã e um navegador
bíblico, com notificações diárias de versículo e lembrete de leitura.

## Stack

| | |
|---|---|
| Expo SDK | 57 |
| React Native | 0.86 |
| React | 19.2 |
| TypeScript | 6.0 (`strict`) |
| Navegação | React Navigation 7 (bottom tabs) |

## Como rodar

```bash
npm install
cp .env.example .env    # e preencha a chave do YouTube (ver "Pregações")
npx expo start
```

Sem o `.env`, a aba Pregações mostra um erro de chave não configurada; o resto do
app funciona normalmente.

Leia o QR code com o Expo Go. Para limpar o cache do Metro, use `npx expo start -c`.

O projeto é **managed** — não existem pastas `ios/` nem `android/`, e elas estão
no `.gitignore`. Se precisar gerá-las, rode `npx expo prebuild`.

### Verificações

```bash
npm test            # testes da lógica (Jest): datas, Pix, versículos, conteúdo...
npm run typecheck   # checagem de tipos
npx expo-doctor     # dependências, versões e schema do app.json
npm run check       # os três juntos — rode antes de publicar
```

Todos devem passar sem nenhum aviso. Os testes ficam em `__tests__/` ao lado
do código testado e cobrem só funções puras (sem tela).

Relatório de auditoria e pendências: `docs/AUDITORIA.md`.

## Estrutura

```
App.tsx                      registra as notificações e monta o navegador
index.ts                     entrada do Expo
src/
  navigation/AppNavigator    bottom tabs: Início, Calendário, Pregações, Rádio, Bíblia
  components/
    ChurchLogo               logo da igreja recriada em texto (Fira Sans + Fira Mono)
    ScreenHeader             cabeçalho de todas as abas: logo + título da tela
  screens/
    HomeScreen               próximo culto, versículo, última ministração, atalhos
    CalendarScreen           programação da semana, por dia
    SermonsScreen            séries e cultos do YouTube + player em modal
    RadioScreen              player de streaming + estações + playlist
    BibleScreen              versículo do dia, busca de livros, capítulos
  services/
    notificationService      permissões, canal Android e agendamento diário
    youtubeService           API do YouTube, cache local e "continuar assistindo"
  constants/theme            COLORS, SIZES, FONTS
  data/churchData            igreja, cultos, eventos especiais e lógica de datas
  data/dailyVerses           484 versículos do dia (gerado)
  utils/format               datas, horas e durações em português
  services/errorReporter     erros do app → tabela app_errors
  services/contentParser     validação do content/igreja.json
  components/sermons         VideoRow e VideoPlayerModal da aba Pregações
supabase/
  migrations/                todo o SQL do banco, em ordem
  functions/send-feedback    Edge Function das avaliações
  data/bible/
    books.ts                 índice gerado: 66 livros + carga sob demanda
    blivre/                  um JSON por livro (Bíblia Livre)
scripts/build-bible.mjs      gera books.ts e os JSONs por livro
```

## Identidade visual

Tirada da logo e do banner do canal da Casa de Adoração (Trindade-GO):

| Token | Cor | Uso |
|---|---|---|
| `primary` | `#823030` vinho | nome da igreja, destaques, aba ativa |
| `text` | `#333333` grafite | textos |
| `surface` | `#E3E1DF` cinza da logo | cabeçalhos |
| `background` | `#EEECEB` | fundo das telas |

Fontes: **Fira Sans** (títulos, como o nome na logo) e **Fira Mono** (subtítulos,
como "Reino de Sacerdotes"). São importadas peso a peso em `App.tsx` — o índice
do pacote embutiria os 18 pesos.

### Modo claro e escuro

`src/constants/theme.ts` tem duas paletas com as mesmas chaves, `LIGHT` e
`DARK`. Nenhuma tela importa cores fixas: cada uma declara
`makeStyles = (c: Palette) => StyleSheet.create(...)` e usa
`useThemedStyles(makeStyles)`, que devolve os estilos da paleta ativa.

A escolha (automático, claro ou escuro) fica em Configurações. No automático o
app segue o celular — por isso `userInterfaceStyle` é `automatic` no
`app.json`.

## Configurações

Tela empilhada sobre as abas, aberta pela engrenagem no topo de qualquer aba.
As preferências ficam em `SettingsContext` (AsyncStorage, chave `settings:v1`):

- aparência: automático / claro / escuro
- tamanho do texto da Bíblia (também ajustável no leitor, botão "Aa")
- notificações: versículo do dia (7h), lembrete de leitura (19h), lembrete
  1 hora antes de cada culto — reagendadas a cada mudança
- limpar dados salvos (cache do YouTube, continuar assistindo/lendo)
- sobre: redes da igreja, tradução, versão

A logo é tipográfica, então `ChurchLogo` a recria em texto em vez de usar a
imagem. Ícone, splash e ícones Android em `assets/` foram gerados a partir da
foto de perfil do canal, com o fundo removido.

## Mídia

`RadioScreen` usa **expo-audio** (`useAudioPlayer` + `useAudioPlayerStatus`). O
pacote `expo-av`, usado até então, foi removido no SDK 54 e não funciona mais.

O player de áudio é recriado a cada troca de estação — o hook libera o anterior
sozinho, então não há `unload` manual.

### Estações

A lista fica em `src/data/radioStations.ts`, separada em três abas por idioma:

| Aba | Rádios |
|---|---|
| 🇧🇷 Brasil | Vinha FM, Rede Aleluia (Goiânia), Sara Brasil FM, Feliz FM, Novo Tempo, Melodia FM, Rádio Super, Gospel FM |
| 🇺🇸 English | K-LOVE, Air1, Moody Radio, Premier Christian Radio, Premier Praise, UCB 1, Spirit FM |
| 🇪🇸 Español | Radio Visión Cristiana, Ondas de Vida, HCJB, Alfa y Omega, Radio Viva, Red Nacional Cristiana, Radio Cristiana Venezuela |

São rádios de terceiros, tocadas pelo stream público oficial de cada uma. Todas
em HTTPS, que iOS e Android exigem, e testadas com um GET antes de entrar. A
Gospel FM 90.1 (SP) ficou de fora porque o certificado do servidor dela é
inválido. Antes de publicar na loja, vale pedir autorização às emissoras. O
diretório [Radio Browser](https://www.radio-browser.info) ajuda a achar links.

Rádio ao vivo não tem duração, então a tela não mostra barra de progresso. Os
botões ⏮ ⏭ trocam de estação dentro do idioma atual. Se o stream não começar
em 20 s, a tela mostra "sem sinal" em vez de carregar para sempre. O app
lembra a última estação ouvida.

### Segundo plano e tela de bloqueio

A rádio continua tocando com o app minimizado ou a tela bloqueada, e aparece
na notificação de mídia (Android) e na tela de bloqueio / Central de Controle
(iOS) com play/pause, nome da estação e o ícone do app como capa.

Três peças fazem isso funcionar:

- `setAudioModeAsync({ shouldPlayInBackground: true, interruptionMode: 'doNotMix' })`
- `player.setActiveForLockScreen(...)` a cada player novo — no Android é o que
  mantém o serviço de mídia em primeiro plano; sem ele o sistema corta o áudio
  após ~3 min
- o plugin `expo-audio` no `app.json`, que adiciona `UIBackgroundModes: audio`
  no iOS e o serviço `mediaPlayback` no Android

O plugin só vale em build nativo (EAS ou `npx expo run:*`). No Expo Go, o
comportamento depende do que o próprio Expo Go já traz configurado.

## Pregações

A aba lê o canal [Casa de Adoração Official](https://www.youtube.com/@casadeadoracaoofficial)
pela **YouTube Data API v3** e toca os vídeos com o player oficial do YouTube
(`react-native-youtube-iframe`). Vídeo publicado no canal aparece no app sozinho,
sem republicar nada.

- **Séries** — as playlists do canal, que já são a curadoria da igreja.
- **Cultos** — todos os uploads com 20 min ou mais, do mais recente ao mais
  antigo. O corte separa os cultos (40 min+) dos devocionais curtos (até ~9 min);
  no canal não há vídeos entre 10 e 40 min.
- **Destaques** — aba inicial: último culto em destaque, continuar assistindo,
  carrossel de séries e cultos recentes. No horário dos cultos (programação em
  `churchData`) aparece um aviso que abre `/live` do canal no YouTube.
- **Histórico por vídeo** — `yt:history` guarda até 60 vídeos com o minuto em
  que a pessoa parou. Daí saem a barra de progresso nas miniaturas, o selo
  "Assistido", o "continuar assistindo" e o "continuar · episódio N" das
  séries. Tocar um vídeo começado retoma de onde parou.
- **Cultos** agrupados por mês, com busca pelo título (entre os já carregados).
- **A seguir** — ao fim de um vídeo, o próximo da série começa sozinho.
- **Compartilhar** e **abrir no YouTube** no player.

O player do YouTube é a única forma permitida pelos Termos de Serviço. Por isso
**não há download nem modo offline** para os vídeos — diferente da Bíblia.

### Chave da API

A chave vai em `.env` (ignorado pelo Git), a partir de `.env.example`:

```
EXPO_PUBLIC_YOUTUBE_API_KEY=...
```

Ela só lê dados públicos, então **não** exige acesso à conta do canal. Crie em
[Google Cloud Console](https://console.cloud.google.com) → APIs e serviços →
Credenciais, com a API **YouTube Data API v3** ativada, e restrinja a chave a essa
API. Para o build de produção, cadastre a mesma variável no EAS.

O prefixo `EXPO_PUBLIC_` embute a chave no app, e ela pode ser extraída do APK —
é assim com qualquer chave em app mobile. A restrição à YouTube Data API v3 é o
que limita o estrago: quem a extrair só consegue ler dados públicos do YouTube
usando a sua cota.

### Cota

O limite gratuito é de 10.000 unidades por dia, **por chave** — ou seja,
compartilhado entre todos os aparelhos. Cada chamada custa 1 unidade, e o cache
local segura o consumo:

| Dado | Chamadas | Cache no aparelho |
|---|---|---|
| Lista de séries | 1 | 24 h |
| Vídeos de uma série | 2 | 24 h |
| Cultos, 50 mais recentes | 2 | 3 h |
| "Carregar cultos anteriores" | 2 | não |

Isso dá ~7 unidades por usuário por dia, ou ~1.400 usuários diários antes do
limite. Se a cota acabar, o app segue mostrando o que tem em cache e a API volta
no dia seguinte; não há cobrança. Para acompanhar: APIs e serviços → Painel →
YouTube Data API v3.

## Bíblia

O texto completo está embutido no app e funciona offline: 66 livros, 1.189
capítulos e 31.102 versículos.

A tradução é a **Bíblia Livre**, que está em **domínio público** — pode ser
redistribuída sem licença. Os dados vêm de
[damarals/biblias](https://github.com/damarals/biblias) (MIT).

> As traduções mais conhecidas nas igrejas — ARA, ARC, ACF, NVI, NTLH — são
> protegidas por direito autoral. A Sociedade Bíblica do Brasil libera até 500
> versículos sem autorização formal, e a Trinitariana até 1.100. A Bíblia
> completa tem 31.102, então embuti-las exigiria licença por escrito do
> detentor.

### Como os dados são organizados

Um arquivo único de ~3,8 MB faria o Metro avaliar a Bíblia inteira na
inicialização. Em vez disso, cada livro é um módulo próprio em
`src/data/bible/blivre/`, carregado por `loadBookChapters(slug)` apenas quando
alguém o abre. O maior é Salmos, com 224 KB.

O slug vem do **nome** do livro, não da sigla: "Jó" e "Jo" (João) reduziriam ao
mesmo identificador e um sobrescreveria o arquivo do outro. O script trava se
detectar colisão.

### Regenerar ou trocar de tradução

```bash
curl -LO https://github.com/damarals/biblias/releases/download/v1.0.0/BLIVRE.json
node scripts/build-bible.mjs BLIVRE.json blivre
```

O segundo argumento nomeia a pasta de saída. Para adicionar outra tradução —
se você obtiver licença da ARA, por exemplo — rode o script com a sigla dela e
os arquivos convivem lado a lado, sem mexer nas telas.

`src/data/bible/books.ts` é **gerado**: não edite à mão.

## Notificações

São **apenas locais**: versículo do dia às 7h (um agendamento semanal por dia,
cada um com o versículo daquele dia), lembrete de leitura às 19h e aviso 1 hora
antes de cada culto. `scheduleNotifications(prefs)` cancela e reagenda tudo
conforme as Configurações. Notificação local não precisa
de conta Expo, `projectId` ou servidor.

`registerForPushNotificationsAsync()` só devolve um token Expo se houver um
`extra.eas.projectId` no `app.json`. Sem ele, retorna `undefined` sem erro. Para
habilitar push remoto de verdade:

```bash
npx expo login
npx eas init      # grava o projectId no app.json
```

Isso sozinho não envia nada — push remoto exige também um servidor que dispare
as mensagens para o token.

## Estado dos dados

Os cultos em `src/data/churchData.ts` são os oficiais do banner do canal
(quarta 19h30 e domingo 18h).

**Eventos especiais** (conferência, batismo, vigília) vão em `SPECIAL_EVENTS`,
no mesmo arquivo, com data `AAAA-MM-DD` — há um exemplo comentado. Eles
aparecem em dourado no calendário da aba Programação, numa lista própria e na
contagem do próximo evento.

A aba Programação tem contagem regressiva para o próximo culto ("acontecendo
agora" durante o culto, com link para o ao vivo), adicionar à agenda do
celular (formulário nativo via `expo-calendar/legacy`; semanal para cultos),
convite por mensagem e calendário do mês (`react-native-calendars`). Os versículos do dia são uma lista fixa de sete.

O texto bíblico **não** é dado de demonstração: é a Bíblia Livre completa, e
está pronta para uso. As pregações também não: vêm ao vivo do canal da igreja.
As rádios tocam os streams reais das emissoras.

## Conteúdo editável

Avisos da Início e eventos especiais vêm de `content/igreja.json`, baixado do
GitHub pelo app (cache de 30 min). Editar esse arquivo no site do GitHub muda o
app de todo mundo sem publicar versão nova — passo a passo em
`content/LEIA-ME.md`.

## Versículo do dia

`src/data/dailyVerses.ts` é **gerado** por `scripts/build-daily-verses.mjs`:
484 referências com o texto da Bíblia Livre embutida, em sequência contínua
(nenhum se repete antes de a lista acabar). Para mudar, edite `REFS` no script e
rode `node scripts/build-daily-verses.mjs`.

## Dízimos (Pix)

Preencha `CHURCH_INFO.pix.key` em `src/data/churchData.ts`. Com a chave vazia,
a tela e o atalho ficam escondidos. O QR e o "copia e cola" são um BR Code
estático gerado no app (`pixService.ts`), sem valor definido.

## Publicação

Identificadores: `com.casadeadoracao.app` (iOS e Android). **Não mudam depois
da primeira publicação.**

1. Contas: Apple Developer (US$ 99/ano) e Google Play Console (US$ 25, uma vez).
2. `npm install -g eas-cli`, `eas login` e `eas init` (grava o `projectId`).
3. Cadastre a chave do YouTube no EAS — o `.env` não vai para o build:
   `eas env:create --name EXPO_PUBLIC_YOUTUBE_API_KEY --value <chave> --environment production --environment preview --visibility plaintext`
4. Builds (`eas.json`):
   - `eas build -p android --profile preview` → APK para instalar e testar;
   - `eas build -p ios --profile production` → envie ao TestFlight com
     `eas submit -p ios`;
   - `eas build -p android --profile production` → AAB para a Play Store.
5. Política de privacidade: https://victinjr199xs-cyber.github.io/casadeadoracao/privacidade.html
   (link em Configurações e na tela de entrada; cópia em `PRIVACIDADE.md`).
6. **Restrinja a chave do YouTube** no Google Cloud › Credenciais:
   - restrição de API: só *YouTube Data API v3*;
   - restrição de aplicativo: iOS com bundle `com.casadeadoracao.app` e Android
     com pacote `com.casadeadoracao.app` + SHA-1 do certificado (EAS ›
     Credentials). O app envia esses dados nos cabeçalhos
     (`X-Ios-Bundle-Identifier`, `X-Android-Package`, `X-Android-Cert`); o SHA-1
     vai em `EXPO_PUBLIC_ANDROID_CERT_SHA1`.
   - Com restrição de aplicativo, a chave deixa de funcionar no Expo Go; use
     uma segunda chave, sem essa restrição, só para desenvolvimento.
7. Peça autorização às rádios antes de publicar (streams de terceiros).

## Licença

Ver [LICENSE](LICENSE).

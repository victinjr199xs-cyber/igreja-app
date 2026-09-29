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
npx tsc --noEmit    # checagem de tipos
npx expo-doctor     # dependências, versões e schema do app.json
```

Ambos devem passar sem nenhum aviso.

## Estrutura

```
App.tsx                      registra as notificações e monta o navegador
index.ts                     entrada do Expo
src/
  navigation/AppNavigator    bottom tabs: Calendário, Pregações, Rádio, Bíblia
  screens/
    CalendarScreen           programação da semana, por dia
    SermonsScreen            séries e cultos do YouTube + player em modal
    RadioScreen              player de streaming + estações + playlist
    BibleScreen              versículo do dia, busca de livros, capítulos
  services/
    notificationService      permissões, canal Android e agendamento diário
    youtubeService           API do YouTube, cache local e "continuar assistindo"
  constants/theme            COLORS, SIZES, FONTS
  data/churchData            eventos e versículos do dia
  data/bible/
    books.ts                 índice gerado: 66 livros + carga sob demanda
    blivre/                  um JSON por livro (Bíblia Livre)
scripts/build-bible.mjs      gera books.ts e os JSONs por livro
```

## Mídia

`RadioScreen` usa **expo-audio** (`useAudioPlayer` + `useAudioPlayerStatus`). O
pacote `expo-av`, usado até então, foi removido no SDK 54 e não funciona mais.

O player de áudio é recriado a cada troca de estação — o hook libera o anterior
sozinho, então não há `unload` manual.

### Estações

| Rádio | Stream |
|---|---|
| Vinha FM 91.9 (Goiânia) | Icecast/Shoutcast, MP3 |
| Melodia FM 97.5 (RJ) | StreamTheWorld, AAC — via redirect que escolhe o servidor |
| Novo Tempo | HLS (`.m3u8`) |
| Rádio Super 100.5 (BH) | Shoutcast, MP3 |

São rádios de terceiros, tocadas pelo stream público oficial de cada uma. Todas
em HTTPS, que iOS e Android exigem. Antes de publicar na loja, vale pedir
autorização por escrito às emissoras. Para trocar ou adicionar, edite
`RADIO_STATIONS` em `RadioScreen`; o diretório
[Radio Browser](https://www.radio-browser.info) ajuda a achar os links.

Rádio ao vivo não tem duração, então a tela não mostra barra de progresso. Os
botões ⏮ ⏭ trocam de estação.

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
- **Continuar assistindo** — ao fechar o player no meio de um vídeo, o app guarda
  o minuto e oferece retomar.
- **A seguir** — ao fim de um vídeo, o próximo da série começa sozinho.

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

São **apenas locais**: versículo do dia às 7h e lembrete de leitura às 19h,
agendados por `scheduleDailyVerseNotification()`. Notificação local não precisa
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

Os eventos e versículos em `src/data/churchData.ts` são de demonstração e
precisam ser substituídos por dados reais da igreja.

O texto bíblico **não** é dado de demonstração: é a Bíblia Livre completa, e
está pronta para uso. As pregações também não: vêm ao vivo do canal da igreja.
As rádios tocam os streams reais das emissoras.

## Licença

Ver [LICENSE](LICENSE).

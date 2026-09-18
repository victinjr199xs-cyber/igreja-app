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
npx expo start
```

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
    SermonsScreen            lista de pregações + player em modal
    RadioScreen              player de streaming + estações + playlist
    BibleScreen              versículo do dia, busca de livros, capítulos
  services/
    notificationService      permissões, canal Android e agendamento diário
  constants/theme            COLORS, SIZES, FONTS
  data/churchData            eventos, pregações e versículos do dia
  data/bible/
    books.ts                 índice gerado: 66 livros + carga sob demanda
    blivre/                  um JSON por livro (Bíblia Livre)
scripts/build-bible.mjs      gera books.ts e os JSONs por livro
```

## Mídia

`RadioScreen` usa **expo-audio** (`useAudioPlayer` + `useAudioPlayerStatus`) e
`SermonsScreen` usa **expo-video** (`useVideoPlayer` + `VideoView`). O pacote
`expo-av`, usado até então, foi removido no SDK 54 e não funciona mais.

O player de áudio é recriado a cada troca de estação — o hook libera o anterior
sozinho, então não há `unload` manual. O player de vídeo vive no nível do
componente, e não dentro do `<Modal>`, por isso a tela pausa explicitamente ao
fechar.

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

Todo o conteúdo em `src/data/churchData.ts` é de demonstração e precisa ser
substituído por dados reais da igreja. Dois pontos que afetam o funcionamento
hoje:

- **Estações de rádio** — as três URLs em `RadioScreen` são placeholders e
  respondem `403`. A tela funciona, mas não há áudio até apontarem para um
  stream real.
- **Vídeos das pregações** — apontam para o bucket de amostras do Google
  (`commondatastorage.googleapis.com`), que também responde `403`. O player
  abre, mas não carrega.

A playlist exibida na tela de Rádio é decorativa: as faixas não têm URL própria,
e tocá-las inicia a estação selecionada.

O texto bíblico **não** é dado de demonstração: é a Bíblia Livre completa, e
está pronta para uso.

## Licença

Ver [LICENSE](LICENSE).

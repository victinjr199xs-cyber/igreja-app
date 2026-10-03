# Distribuir o app para testadores

Projeto no EAS: **@victinjr199xs/igreja-app**
(https://expo.dev/accounts/victinjr199xs/projects/igreja-app).

As chaves públicas (YouTube e Supabase) estão cadastradas no EAS, ambientes
`preview` e `production` — o `.env` local não vai para a nuvem.

## Android — APK por link

```bash
npx eas-cli build --platform android --profile preview
```

O build roda na nuvem da Expo (~10–20 min). No fim, a página do build tem um
**link e um QR code de instalação**. Mande o link para a pessoa:

1. Ela abre o link **no celular Android** e toca em **Install**.
2. O Android pede para permitir "instalar apps desta fonte" (navegador/Drive/
   WhatsApp) — é normal para apps fora da Play Store.
3. Instala e abre como qualquer app. Não precisa do seu computador ligado.

## Atualizar sem reinstalar (EAS Update)

O APK tem o **expo-updates** no canal `preview`. Mudanças de telas, textos e
lógica (JavaScript) chegam sozinhas:

```bash
npx eas-cli update --channel preview --message "o que mudou"
```

O app baixa a atualização ao abrir e aplica **na abertura seguinte** (feche e
abra de novo para ver).

Precisa de **APK novo** (novo `eas build`) quando mudar algo nativo: instalar
ou remover biblioteca com código nativo, mudar `app.json` (ícone, permissões,
plugins) ou a `version`. Ao mudar a `version`, o APK antigo deixa de receber
atualizações (`runtimeVersion` segue a versão do app).

## iOS

A Apple não deixa instalar app fora da App Store sem conta de desenvolvedor.

| Caminho | Precisa | Como a pessoa recebe |
|---|---|---|
| **TestFlight** (recomendado) | Apple Developer, US$ 99/ano | Convite por e-mail ou link público; instala pelo app TestFlight |
| Ad hoc (interno) | Apple Developer | Cadastrar o UDID do iPhone dela e gerar build específico |
| Expo Go + túnel (provisório) | Nada | Só funciona com o **seu computador ligado** rodando `tunel` (abaixo) |

Com a conta Apple Developer:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

Depois, no App Store Connect › TestFlight, adicione os testadores. O EAS
Update também funciona no iOS (canal `production`).

### Expo Go à distância (sem conta Apple)

No CMD, na pasta do projeto:

```
tunel
```

O script (`scripts/tunel.ps1`) abre um túnel gratuito da **Cloudflare**, sem
login no Expo nem na Cloudflare, e inicia o app já compactado. Aparece um
link `exp://...trycloudflare.com` e o QR code:

1. Mande o link pelo WhatsApp (ou o print do QR, para ler com a câmera de
   outro aparelho).
2. A pessoa instala o **Expo Go** (App Store), toca no link e espera. A
   primeira abertura leva de alguns segundos a 1 minuto. Não precisa entrar em
   conta nenhuma no Expo Go: o botão de perfil dele é opcional.
3. Funciona **só enquanto a janela estiver aberta** e o computador ligado. A
   cada vez que você roda `tunel`, o endereço muda: mande o novo.

Requisito único: `cloudflared.exe` em `C:\Users\<você>\tools\` (oficial,
assinado pela Cloudflare: github.com/cloudflare/cloudflared/releases,
arquivo `cloudflared-windows-amd64.exe`, renomeado).

Por que não `npx expo start --tunnel`: o túnel do Expo (ngrok) exige login no
Expo e, deslogado, recebia os pedidos sem repassar ao app ("The request timed
out" no iPhone). Testado em 03/10/2026: pelo `tunel`, manifesto e app
(12,6 MB) chegam pela internet em ~9 s.

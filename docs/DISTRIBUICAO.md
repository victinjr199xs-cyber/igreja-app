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
| Expo Go + túnel (provisório) | Nada | Só funciona com o **seu computador ligado** rodando `npx expo start --tunnel` |

Com a conta Apple Developer:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

Depois, no App Store Connect › TestFlight, adicione os testadores. O EAS
Update também funciona no iOS (canal `production`).

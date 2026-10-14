# Skills de terceiros neste projeto

Instaladas em 14/10/2026 em `.claude/skills/` (essa pasta **não vai para o
GitHub**: é texto de terceiros; ver `.gitignore`). Licença MIT de cada origem em
`.claude/licenses/`.

Foram copiadas só as pastas das skills, **sem os plugins**: os plugins trazem
ganchos que rodam sozinhos e servidores externos (o do Expo envia telemetria de
uso e usa `mcp.expo.dev`; o do Superpowers roda um script a cada abertura de
sessão).

| Skill | Origem | Commit |
|---|---|---|
| systematic-debugging, verification-before-completion, requesting-code-review, writing-plans | [obra/superpowers](https://github.com/obra/superpowers) | `bb92a77` |
| expo-upgrade, expo-data-fetching, expo-native-ui, expo-design-system, expo-animation | [expo/skills](https://github.com/expo/skills) | `d4f4840` |
| supabase, supabase-postgres-best-practices | [supabase/agent-skills](https://github.com/supabase/agent-skills) | `c9be0e9` |
| react-native-best-practices, react-navigation | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) | `59e9d17` |

## Alterações feitas nas cópias

- Removida a seção **"Submitting Feedback"** do final das 5 skills do Expo: ela
  mandava rodar `npx --yes submit-expo-feedback@latest` (programa baixado na
  hora) com "o máximo de contexto relevante", ou seja, enviar trechos do
  projeto ao Expo.
- Removidas as imagens `.png` de `react-native-best-practices` (6 MB; só
  ilustram os textos).

## Revisão (14/10/2026)

Varredura por download-e-execução, envio de dados, instruções de esconder algo
do usuário e acesso a chaves: nada além do item acima. Único script:
`systematic-debugging/find-polluter.sh` (roda os testes um a um; só executa se
for chamado).

## Atualizar ou refazer

Os repositórios originais ficam em `D:\tools\skills-src`. Para atualizar,
`git pull` lá, **reler o que mudou** e recopiar as pastas. Não instale os
plugins deles neste projeto sem rever os ganchos.

Atenção: `.claude/settings.json` (já existia, vindo do modelo do Expo) liga o
plugin `expo@claude-plugins-official`. Se alguém instalar esse plugin, os ganchos
de telemetria dele passam a valer aqui.

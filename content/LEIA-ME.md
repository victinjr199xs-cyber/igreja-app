# Como editar avisos e eventos do app

O app baixa o arquivo [`igreja.json`](igreja.json) desta pasta sempre que é
aberto (no máximo a cada 30 minutos). Editou aqui, aparece no app de todo mundo
— sem publicar versão nova na loja.

## Passo a passo (pelo navegador)

1. Abra [`content/igreja.json`](igreja.json) no GitHub.
2. Clique no lápis ✏️ (**Edit this file**).
3. Altere o texto seguindo os modelos abaixo.
4. Clique em **Commit changes…** e confirme.

Em até alguns minutos o app mostra a novidade. Se o arquivo tiver um erro de
digitação (uma vírgula ou aspas faltando), o app ignora a mudança e continua
mostrando a versão anterior — confira em https://jsonlint.com se ficar em dúvida.

## Aviso

Aparece na página inicial do app até a data em `ate` (inclusive).

```json
{
  "id": "campanha-alimentos",
  "titulo": "Campanha de alimentos",
  "texto": "Traga 1 kg de alimento não perecível no culto de domingo.",
  "ate": "2026-11-15",
  "link": "https://www.instagram.com/casadeadoracaooficial/"
}
```

- `id`: nome único, sem espaços nem acentos.
- `ate`: último dia em que o aviso aparece (`AAAA-MM-DD`). Sem ele, fica para sempre.
- `link`: opcional; vira um botão "Saiba mais".

## Evento especial

Aparece em dourado no calendário da aba Programação, na lista de eventos
especiais e na contagem do próximo culto/evento.

```json
{
  "id": "conferencia-2026",
  "titulo": "Conferência de Adoração",
  "descricao": "Três noites de louvor e Palavra.",
  "data": "2026-11-14",
  "hora": "19:00",
  "local": "St. Cristina II · Trindade-GO"
}
```

## Vários itens

Separe os itens com vírgula, dentro dos colchetes:

```json
{
  "avisos": [
    { "id": "a", "titulo": "...", "texto": "..." },
    { "id": "b", "titulo": "...", "texto": "..." }
  ],
  "eventos": []
}
```

/**
 * Gera src/data/dailyVerses.ts: um versículo para cada dia do ano, com o texto
 * tirado da Bíblia já embutida no app (src/data/bible/<versao>/).
 *
 * Uso:
 *   node scripts/build-daily-verses.mjs [versao]
 *
 * Para trocar ou reordenar versículos, edite REFS e rode de novo. O script
 * trava se uma referência não existir ou aparecer duas vezes.
 */
import fs from 'node:fs';
import path from 'node:path';

const version = (process.argv[2] ?? 'blivre').toLowerCase();
const bibleDir = path.join('src', 'data', 'bible', version);
const out = path.join('src', 'data', 'dailyVerses.ts');

// "livro cap:vers" — o livro é o slug do arquivo em src/data/bible/<versao>/.
const REFS = `
genesis 1:1 | genesis 1:27 | genesis 2:7 | genesis 12:2 | genesis 15:6 | genesis 28:15 | genesis 50:20
exodo 14:14 | exodo 15:2 | exodo 20:12 | exodo 33:14
levitico 19:18
numeros 6:24 | numeros 6:25 | numeros 6:26 | numeros 23:19
deuteronomio 6:5 | deuteronomio 7:9 | deuteronomio 31:6 | deuteronomio 31:8 | deuteronomio 33:27
josue 1:8 | josue 1:9 | josue 24:15
rute 1:16
1-samuel 2:2 | 1-samuel 12:24 | 1-samuel 16:7
2-samuel 22:2 | 2-samuel 22:31
1-reis 8:61
1-cronicas 16:11 | 1-cronicas 16:34 | 1-cronicas 29:11
2-cronicas 7:14 | 2-cronicas 16:9
neemias 8:10
jo 19:25 | jo 23:10 | jo 42:2
salmos 1:1 | salmos 1:2 | salmos 1:3 | salmos 4:8 | salmos 5:3 | salmos 5:11 | salmos 9:1 | salmos 9:10
salmos 16:8 | salmos 16:11 | salmos 18:2 | salmos 19:1 | salmos 19:14 | salmos 20:4 | salmos 23:1 | salmos 23:4
salmos 23:6 | salmos 25:4 | salmos 27:1 | salmos 27:14 | salmos 28:7 | salmos 29:11 | salmos 30:5 | salmos 31:24
salmos 32:8 | salmos 33:12 | salmos 34:1 | salmos 34:4 | salmos 34:8 | salmos 34:18 | salmos 37:4 | salmos 37:5
salmos 37:7 | salmos 40:1 | salmos 42:1 | salmos 42:11 | salmos 46:1 | salmos 46:10 | salmos 51:10 | salmos 55:22
salmos 56:3 | salmos 57:10 | salmos 62:1 | salmos 62:8 | salmos 63:1 | salmos 66:20 | salmos 68:19 | salmos 73:26
salmos 84:11 | salmos 86:5 | salmos 90:12 | salmos 91:1 | salmos 91:2 | salmos 91:11 | salmos 94:19 | salmos 95:1
salmos 96:1 | salmos 100:4 | salmos 100:5 | salmos 103:1 | salmos 103:2 | salmos 103:12 | salmos 107:1 | salmos 111:10
salmos 115:1 | salmos 118:24 | salmos 119:11 | salmos 119:105 | salmos 119:114 | salmos 121:1 | salmos 121:2 | salmos 121:8
salmos 126:3 | salmos 127:1 | salmos 133:1 | salmos 136:1 | salmos 138:8 | salmos 139:14 | salmos 139:23 | salmos 143:8
salmos 145:18 | salmos 146:5 | salmos 147:3 | salmos 150:6 | salmos 3:3 | salmos 8:1 | salmos 17:8 | salmos 18:30
salmos 27:4 | salmos 36:7 | salmos 37:23 | salmos 40:3 | salmos 48:14 | salmos 61:2 | salmos 71:5 | salmos 89:1
salmos 92:1 | salmos 98:1 | salmos 112:7 | salmos 116:1 | salmos 119:50 | salmos 130:5 | salmos 141:3 | salmos 145:3
proverbios 3:5 | proverbios 3:6 | proverbios 3:7 | proverbios 4:23 | proverbios 9:10 | proverbios 10:12 | proverbios 11:25
proverbios 12:25 | proverbios 13:20 | proverbios 14:26 | proverbios 15:1 | proverbios 16:3 | proverbios 16:9 | proverbios 17:17
proverbios 18:10 | proverbios 19:21 | proverbios 22:6 | proverbios 27:17 | proverbios 28:13 | proverbios 31:30 | proverbios 2:6
proverbios 8:17 | proverbios 16:24 | proverbios 21:21
eclesiastes 3:1 | eclesiastes 3:11 | eclesiastes 4:9 | eclesiastes 12:13
canticos 8:7
isaias 9:6 | isaias 12:2 | isaias 26:3 | isaias 30:15 | isaias 40:8 | isaias 40:29 | isaias 40:31 | isaias 41:10
isaias 41:13 | isaias 43:1 | isaias 43:2 | isaias 43:18 | isaias 43:19 | isaias 49:15 | isaias 53:5 | isaias 54:10
isaias 55:6 | isaias 55:8 | isaias 55:9 | isaias 58:11 | isaias 60:1 | isaias 61:1 | isaias 64:8 | isaias 25:1 | isaias 46:4
jeremias 17:7 | jeremias 29:11 | jeremias 29:13 | jeremias 31:3 | jeremias 32:17 | jeremias 33:3 | jeremias 17:14
lamentacoes-de-jeremias 3:22 | lamentacoes-de-jeremias 3:23 | lamentacoes-de-jeremias 3:25
ezequiel 36:26
daniel 2:20 | daniel 12:3
oseias 6:3 | joel 2:13 | joel 2:28 | amos 5:24 | miqueias 6:8 | miqueias 7:18 | naum 1:7
habacuque 3:17 | habacuque 3:18 | habacuque 3:19 | sofonias 3:17 | ageu 2:9 | zacarias 4:6 | malaquias 3:10
mateus 4:4 | mateus 5:3 | mateus 5:4 | mateus 5:5 | mateus 5:6 | mateus 5:7 | mateus 5:8 | mateus 5:9
mateus 5:14 | mateus 5:16 | mateus 5:44 | mateus 6:6 | mateus 6:21 | mateus 6:33 | mateus 6:34 | mateus 7:7
mateus 7:12 | mateus 11:28 | mateus 11:29 | mateus 16:26 | mateus 17:20 | mateus 18:20 | mateus 19:26 | mateus 22:37
mateus 22:39 | mateus 24:35 | mateus 28:19 | mateus 28:20 | mateus 5:13 | mateus 6:9 | mateus 10:31
marcos 9:23 | marcos 10:27 | marcos 10:45 | marcos 11:24 | marcos 12:30 | marcos 16:15 | marcos 1:17
lucas 1:37 | lucas 1:45 | lucas 2:11 | lucas 6:31 | lucas 6:38 | lucas 9:23 | lucas 10:27 | lucas 11:9
lucas 12:34 | lucas 15:7 | lucas 18:27 | lucas 19:10 | lucas 6:27 | lucas 12:7
joao 1:1 | joao 1:5 | joao 1:12 | joao 1:14 | joao 3:16 | joao 3:17 | joao 4:24 | joao 6:35
joao 7:38 | joao 8:12 | joao 8:32 | joao 10:10 | joao 10:11 | joao 10:27 | joao 11:25 | joao 13:34
joao 13:35 | joao 14:1 | joao 14:2 | joao 14:6 | joao 14:13 | joao 14:21 | joao 14:27 | joao 15:5
joao 15:7 | joao 15:12 | joao 15:13 | joao 16:33 | joao 17:17 | joao 20:29 | joao 6:37 | joao 8:36 | joao 15:16
atos 1:8 | atos 2:38 | atos 2:42 | atos 4:12 | atos 16:31 | atos 17:28 | atos 20:35 | atos 3:19
romanos 1:16 | romanos 3:23 | romanos 5:1 | romanos 5:5 | romanos 5:8 | romanos 6:23 | romanos 8:1 | romanos 8:18
romanos 8:26 | romanos 8:28 | romanos 8:31 | romanos 8:37 | romanos 8:38 | romanos 8:39 | romanos 10:9 | romanos 10:17
romanos 12:1 | romanos 12:2 | romanos 12:10 | romanos 12:12 | romanos 12:21 | romanos 13:8 | romanos 15:4 | romanos 15:13
romanos 10:13 | romanos 11:36
1-corintios 2:9 | 1-corintios 3:16 | 1-corintios 6:19 | 1-corintios 10:13 | 1-corintios 10:31 | 1-corintios 13:4
1-corintios 13:7 | 1-corintios 13:13 | 1-corintios 15:57 | 1-corintios 15:58 | 1-corintios 16:13 | 1-corintios 16:14
2-corintios 1:3 | 2-corintios 4:16 | 2-corintios 4:17 | 2-corintios 4:18 | 2-corintios 5:7 | 2-corintios 5:17
2-corintios 9:7 | 2-corintios 12:9 | 2-corintios 12:10 | 2-corintios 3:17 | 2-corintios 9:8
galatas 2:20 | galatas 5:1 | galatas 5:13 | galatas 5:22 | galatas 5:23 | galatas 6:2 | galatas 6:9 | galatas 6:7
efesios 1:3 | efesios 2:8 | efesios 2:10 | efesios 3:20 | efesios 4:2 | efesios 4:26 | efesios 4:29 | efesios 4:32
efesios 5:2 | efesios 6:10 | efesios 6:11 | efesios 3:17 | efesios 5:20
filipenses 1:6 | filipenses 1:21 | filipenses 2:3 | filipenses 2:5 | filipenses 3:13 | filipenses 3:14 | filipenses 4:4
filipenses 4:6 | filipenses 4:7 | filipenses 4:8 | filipenses 4:11 | filipenses 4:13 | filipenses 4:19 | filipenses 2:13
colossenses 1:17 | colossenses 2:6 | colossenses 3:2 | colossenses 3:12 | colossenses 3:13 | colossenses 3:15
colossenses 3:17 | colossenses 3:23 | colossenses 4:2
1-tessalonicenses 5:11 | 1-tessalonicenses 5:16 | 1-tessalonicenses 5:17 | 1-tessalonicenses 5:18 | 1-tessalonicenses 5:24
2-tessalonicenses 3:3 | 2-tessalonicenses 3:16
1-timoteo 1:15 | 1-timoteo 4:12 | 1-timoteo 6:6 | 1-timoteo 6:12 | 1-timoteo 2:5
2-timoteo 1:7 | 2-timoteo 2:15 | 2-timoteo 3:16 | 2-timoteo 4:7 | 2-timoteo 2:13
tito 2:11 | tito 3:5
hebreus 4:12 | hebreus 4:16 | hebreus 10:23 | hebreus 10:24 | hebreus 11:1 | hebreus 11:6 | hebreus 12:1
hebreus 12:2 | hebreus 13:5 | hebreus 13:8 | hebreus 6:19 | hebreus 13:16
tiago 1:2 | tiago 1:5 | tiago 1:12 | tiago 1:17 | tiago 1:19 | tiago 1:22 | tiago 4:7 | tiago 4:8 | tiago 5:16 | tiago 4:10
1-pedro 2:9 | 1-pedro 3:15 | 1-pedro 4:8 | 1-pedro 5:6 | 1-pedro 5:7 | 1-pedro 5:10 | 1-pedro 1:3 | 1-pedro 2:24
2-pedro 3:9 | 2-pedro 3:18 | 2-pedro 1:3
1-joao 1:7 | 1-joao 1:9 | 1-joao 3:1 | 1-joao 3:18 | 1-joao 4:4 | 1-joao 4:7 | 1-joao 4:8 | 1-joao 4:18
1-joao 4:19 | 1-joao 5:4 | 1-joao 5:14 | 1-joao 2:17 | 1-joao 4:16
judas 1:24 | judas 1:25
apocalipse 1:8 | apocalipse 3:20 | apocalipse 21:4 | apocalipse 21:5 | apocalipse 22:13 | apocalipse 4:11
`
  .split(/[|\n]/)
  .map((s) => s.trim())
  .filter(Boolean);

// Nomes dos livros, do índice gerado por build-bible.mjs.
const booksTs = fs.readFileSync(path.join('src', 'data', 'bible', 'books.ts'), 'utf8');
const names = new Map(
  [...booksTs.matchAll(/"slug": "([^"]+)",\s*"name": "([^"]+)"/g)].map((m) => [m[1], m[2]])
);

const cache = new Map();
const seen = new Set();
const verses = [];

for (const ref of REFS) {
  const m = ref.match(/^(\S+) (\d+):(\d+)$/);
  if (!m) throw new Error(`referência mal escrita: "${ref}"`);
  const [, slug, ch, vs] = m;
  if (seen.has(ref)) throw new Error(`referência repetida: ${ref}`);
  seen.add(ref);
  if (!names.has(slug)) throw new Error(`livro desconhecido: ${slug}`);
  if (!cache.has(slug)) {
    cache.set(slug, JSON.parse(fs.readFileSync(path.join(bibleDir, `${slug}.json`), 'utf8')));
  }
  const text = cache.get(slug)[Number(ch) - 1]?.[Number(vs) - 1];
  if (!text) throw new Error(`versículo inexistente: ${ref}`);
  verses.push({
    reference: `${names.get(slug)} ${ch}:${vs}`,
    // O texto de origem tem espaços duplos esporádicos.
    text: text.replace(/\s+/g, ' ').trim(),
    slug,
    chapter: Number(ch),
    verse: Number(vs),
  });
}

if (verses.length < 366) {
  throw new Error(`${verses.length} versículos; são necessários 366 (um por dia, anos bissextos inclusos)`);
}

// Espalha os livros pelo ano em vez de ler Gênesis em janeiro e Apocalipse
// em dezembro: embaralhamento determinístico (mesma ordem a cada geração).
let seed = 20260929;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let i = verses.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [verses[i], verses[j]] = [verses[j], verses[i]];
}

const body = verses.map((v) => '  ' + JSON.stringify(v)).join(',\n');
fs.writeFileSync(
  out,
  `// GERADO POR scripts/build-daily-verses.mjs — NÃO EDITE À MÃO.
// Tradução: ${version.toUpperCase()}. ${verses.length} versículos, um por dia, sem repetir.

export interface DailyVerse {
  reference: string;
  text: string;
  /** Livro, capítulo e versículo, para abrir na aba Bíblia. */
  slug: string;
  chapter: number;
  verse: number;
}

export const DAILY_VERSES: DailyVerse[] = [
${body},
];

/**
 * Versículo do dia. A sequência corre contínua (não recomeça em 1º de janeiro),
 * então nenhum versículo se repete antes de a lista inteira passar. Usa a data
 * do calendário, não o fuso: o dia muda à meia-noite local.
 */
export function verseOfDay(date = new Date()): DailyVerse {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}
`
);
console.log(`${verses.length} versículos -> ${out}`);

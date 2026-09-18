/**
 * Divide uma Bíblia completa em um arquivo JSON por livro e gera o índice
 * tipado que a aplicação consome.
 *
 * O arquivo único tem ~3,8 MB. Importá-lo inteiro faria o Metro avaliar tudo
 * na inicialização, então cada livro vira um módulo próprio, carregado apenas
 * quando alguém o abre.
 *
 * Uso:
 *   node scripts/build-bible.mjs <entrada.json> [sigla]
 *
 * A entrada é o asset de release de https://github.com/damarals/biblias
 * (MIT), no formato [{ abbrev, name, chapters: [[versiculo, ...], ...] }].
 */
import fs from 'node:fs';
import path from 'node:path';

const [input, versionArg] = process.argv.slice(2);
const version = (versionArg ?? 'blivre').toLowerCase();

if (!input) {
  console.error('uso: node scripts/build-bible.mjs <entrada.json> [sigla]');
  process.exit(1);
}

const LIVROS_AT = 39; // Gênesis a Malaquias; o restante é Novo Testamento.
const outDir = path.join('src', 'data', 'bible', version);

/**
 * Gera nomes de arquivo previsíveis a partir do nome do livro:
 * "1 Coríntios" -> "1-corintios".
 *
 * Deriva do nome, e não da sigla, porque as siglas colidem: tanto "Jó" quanto
 * "Jo" (João) reduziriam ao mesmo slug, e um sobrescreveria o arquivo do outro.
 */
const slugify = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const books = JSON.parse(fs.readFileSync(input, 'utf8'));

if (!Array.isArray(books) || books.length !== 66) {
  console.error(`esperava 66 livros, encontrei ${books?.length}`);
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let totalVerses = 0;
let totalChapters = 0;
const meta = [];

books.forEach((book, i) => {
  const slug = slugify(book.name);
  // Guarda só os capítulos: nome e sigla já vivem no índice gerado abaixo.
  const chapters = book.chapters.map((verses) => verses.map((v) => v.trim()));

  totalChapters += chapters.length;
  totalVerses += chapters.reduce((n, c) => n + c.length, 0);

  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(chapters));

  meta.push({
    slug,
    name: book.name,
    abbrev: book.abbrev,
    chapters: chapters.length,
    testament: i < LIVROS_AT ? 'AT' : 'NT',
  });
});

if (new Set(meta.map((b) => b.slug)).size !== meta.length) {
  console.error('colisao de slug entre livros - arquivos se sobrescreveriam');
  process.exit(1);
}

const lines = [
  `// GERADO POR scripts/build-bible.mjs — NÃO EDITE À MÃO.`,
  `// Versão: ${version.toUpperCase()}. Regenere com:`,
  `//   node scripts/build-bible.mjs <entrada.json> ${version}`,
  ``,
  `export type Testament = 'AT' | 'NT';`,
  ``,
  `export interface BibleBook {`,
  `  /** Identificador sem acentos, igual ao nome do arquivo JSON. */`,
  `  slug: string;`,
  `  name: string;`,
  `  abbrev: string;`,
  `  /** Quantidade de capítulos. */`,
  `  chapters: number;`,
  `  testament: Testament;`,
  `}`,
  ``,
  `/** Capítulos de um livro: chapters[capitulo - 1][versiculo - 1]. */`,
  `export type BookChapters = string[][];`,
  ``,
  `export const BIBLE_BOOKS: BibleBook[] = ${JSON.stringify(meta, null, 2)};`,
  ``,
  `/**`,
  ` * Um require por livro, resolvido estaticamente pelo Metro mas avaliado`,
  ` * apenas na primeira leitura — é o que mantém a inicialização barata.`,
  ` */`,
  `const LOADERS: Record<string, () => BookChapters> = {`,
  ...meta.map((b) => `  '${b.slug}': () => require('./${version}/${b.slug}.json') as BookChapters,`),
  `};`,
  ``,
  `export function loadBookChapters(slug: string): BookChapters | null {`,
  `  const loader = LOADERS[slug];`,
  `  return loader ? loader() : null;`,
  `}`,
  ``,
];

fs.writeFileSync(path.join('src', 'data', 'bible', 'books.ts'), lines.join('\n'));

const bytes = fs
  .readdirSync(outDir)
  .reduce((n, f) => n + fs.statSync(path.join(outDir, f)).size, 0);

console.log(`${meta.length} livros, ${totalChapters} capítulos, ${totalVerses.toLocaleString('pt-BR')} versículos`);
console.log(`${outDir}: ${(bytes / 1048576).toFixed(2)} MB`);
console.log(`src/data/bible/books.ts gerado`);

// GERADO POR scripts/build-bible.mjs — NÃO EDITE À MÃO.
// Versão: BLIVRE. Regenere com:
//   node scripts/build-bible.mjs <entrada.json> blivre

export type Testament = 'AT' | 'NT';

export interface BibleBook {
  /** Identificador sem acentos, igual ao nome do arquivo JSON. */
  slug: string;
  name: string;
  abbrev: string;
  /** Quantidade de capítulos. */
  chapters: number;
  testament: Testament;
}

/** Capítulos de um livro: chapters[capitulo - 1][versiculo - 1]. */
export type BookChapters = string[][];

export const BIBLE_BOOKS: BibleBook[] = [
  {
    "slug": "genesis",
    "name": "Gênesis",
    "abbrev": "Gn",
    "chapters": 50,
    "testament": "AT"
  },
  {
    "slug": "exodo",
    "name": "Êxodo",
    "abbrev": "Êx",
    "chapters": 40,
    "testament": "AT"
  },
  {
    "slug": "levitico",
    "name": "Levítico",
    "abbrev": "Lv",
    "chapters": 27,
    "testament": "AT"
  },
  {
    "slug": "numeros",
    "name": "Números",
    "abbrev": "Nm",
    "chapters": 36,
    "testament": "AT"
  },
  {
    "slug": "deuteronomio",
    "name": "Deuteronômio",
    "abbrev": "Dt",
    "chapters": 34,
    "testament": "AT"
  },
  {
    "slug": "josue",
    "name": "Josué",
    "abbrev": "Js",
    "chapters": 24,
    "testament": "AT"
  },
  {
    "slug": "juizes",
    "name": "Juízes",
    "abbrev": "Jz",
    "chapters": 21,
    "testament": "AT"
  },
  {
    "slug": "rute",
    "name": "Rute",
    "abbrev": "Rt",
    "chapters": 4,
    "testament": "AT"
  },
  {
    "slug": "1-samuel",
    "name": "1 Samuel",
    "abbrev": "1Sm",
    "chapters": 31,
    "testament": "AT"
  },
  {
    "slug": "2-samuel",
    "name": "2 Samuel",
    "abbrev": "2Sm",
    "chapters": 24,
    "testament": "AT"
  },
  {
    "slug": "1-reis",
    "name": "1 Reis",
    "abbrev": "1Rs",
    "chapters": 22,
    "testament": "AT"
  },
  {
    "slug": "2-reis",
    "name": "2 Reis",
    "abbrev": "2Rs",
    "chapters": 25,
    "testament": "AT"
  },
  {
    "slug": "1-cronicas",
    "name": "1 Crônicas",
    "abbrev": "1Cr",
    "chapters": 29,
    "testament": "AT"
  },
  {
    "slug": "2-cronicas",
    "name": "2 Crônicas",
    "abbrev": "2Cr",
    "chapters": 36,
    "testament": "AT"
  },
  {
    "slug": "esdras",
    "name": "Esdras",
    "abbrev": "Ed",
    "chapters": 10,
    "testament": "AT"
  },
  {
    "slug": "neemias",
    "name": "Neemias",
    "abbrev": "Ne",
    "chapters": 13,
    "testament": "AT"
  },
  {
    "slug": "ester",
    "name": "Ester",
    "abbrev": "Et",
    "chapters": 10,
    "testament": "AT"
  },
  {
    "slug": "jo",
    "name": "Jó",
    "abbrev": "Jó",
    "chapters": 42,
    "testament": "AT"
  },
  {
    "slug": "salmos",
    "name": "Salmos",
    "abbrev": "Sl",
    "chapters": 150,
    "testament": "AT"
  },
  {
    "slug": "proverbios",
    "name": "Provérbios",
    "abbrev": "Pv",
    "chapters": 31,
    "testament": "AT"
  },
  {
    "slug": "eclesiastes",
    "name": "Eclesiastes",
    "abbrev": "Ec",
    "chapters": 12,
    "testament": "AT"
  },
  {
    "slug": "canticos",
    "name": "Cânticos",
    "abbrev": "Ct",
    "chapters": 8,
    "testament": "AT"
  },
  {
    "slug": "isaias",
    "name": "Isaías",
    "abbrev": "Is",
    "chapters": 66,
    "testament": "AT"
  },
  {
    "slug": "jeremias",
    "name": "Jeremias",
    "abbrev": "Jr",
    "chapters": 52,
    "testament": "AT"
  },
  {
    "slug": "lamentacoes-de-jeremias",
    "name": "Lamentações de Jeremias",
    "abbrev": "Lm",
    "chapters": 5,
    "testament": "AT"
  },
  {
    "slug": "ezequiel",
    "name": "Ezequiel",
    "abbrev": "Ez",
    "chapters": 48,
    "testament": "AT"
  },
  {
    "slug": "daniel",
    "name": "Daniel",
    "abbrev": "Dn",
    "chapters": 12,
    "testament": "AT"
  },
  {
    "slug": "oseias",
    "name": "Oséias",
    "abbrev": "Os",
    "chapters": 14,
    "testament": "AT"
  },
  {
    "slug": "joel",
    "name": "Joel",
    "abbrev": "Jl",
    "chapters": 3,
    "testament": "AT"
  },
  {
    "slug": "amos",
    "name": "Amós",
    "abbrev": "Am",
    "chapters": 9,
    "testament": "AT"
  },
  {
    "slug": "obadias",
    "name": "Obadias",
    "abbrev": "Ob",
    "chapters": 1,
    "testament": "AT"
  },
  {
    "slug": "jonas",
    "name": "Jonas",
    "abbrev": "Jn",
    "chapters": 4,
    "testament": "AT"
  },
  {
    "slug": "miqueias",
    "name": "Miquéias",
    "abbrev": "Mq",
    "chapters": 7,
    "testament": "AT"
  },
  {
    "slug": "naum",
    "name": "Naum",
    "abbrev": "Na",
    "chapters": 3,
    "testament": "AT"
  },
  {
    "slug": "habacuque",
    "name": "Habacuque",
    "abbrev": "Hc",
    "chapters": 3,
    "testament": "AT"
  },
  {
    "slug": "sofonias",
    "name": "Sofonias",
    "abbrev": "Sf",
    "chapters": 3,
    "testament": "AT"
  },
  {
    "slug": "ageu",
    "name": "Ageu",
    "abbrev": "Ag",
    "chapters": 2,
    "testament": "AT"
  },
  {
    "slug": "zacarias",
    "name": "Zacarias",
    "abbrev": "Zc",
    "chapters": 14,
    "testament": "AT"
  },
  {
    "slug": "malaquias",
    "name": "Malaquias",
    "abbrev": "Ml",
    "chapters": 4,
    "testament": "AT"
  },
  {
    "slug": "mateus",
    "name": "Mateus",
    "abbrev": "Mt",
    "chapters": 28,
    "testament": "NT"
  },
  {
    "slug": "marcos",
    "name": "Marcos",
    "abbrev": "Mc",
    "chapters": 16,
    "testament": "NT"
  },
  {
    "slug": "lucas",
    "name": "Lucas",
    "abbrev": "Lc",
    "chapters": 24,
    "testament": "NT"
  },
  {
    "slug": "joao",
    "name": "João",
    "abbrev": "Jo",
    "chapters": 21,
    "testament": "NT"
  },
  {
    "slug": "atos",
    "name": "Atos",
    "abbrev": "At",
    "chapters": 28,
    "testament": "NT"
  },
  {
    "slug": "romanos",
    "name": "Romanos",
    "abbrev": "Rm",
    "chapters": 16,
    "testament": "NT"
  },
  {
    "slug": "1-corintios",
    "name": "1 Coríntios",
    "abbrev": "1Co",
    "chapters": 16,
    "testament": "NT"
  },
  {
    "slug": "2-corintios",
    "name": "2 Coríntios",
    "abbrev": "2Co",
    "chapters": 13,
    "testament": "NT"
  },
  {
    "slug": "galatas",
    "name": "Gálatas",
    "abbrev": "Gl",
    "chapters": 6,
    "testament": "NT"
  },
  {
    "slug": "efesios",
    "name": "Efésios",
    "abbrev": "Ef",
    "chapters": 6,
    "testament": "NT"
  },
  {
    "slug": "filipenses",
    "name": "Filipenses",
    "abbrev": "Fp",
    "chapters": 4,
    "testament": "NT"
  },
  {
    "slug": "colossenses",
    "name": "Colossenses",
    "abbrev": "Cl",
    "chapters": 4,
    "testament": "NT"
  },
  {
    "slug": "1-tessalonicenses",
    "name": "1 Tessalonicenses",
    "abbrev": "1Ts",
    "chapters": 5,
    "testament": "NT"
  },
  {
    "slug": "2-tessalonicenses",
    "name": "2 Tessalonicenses",
    "abbrev": "2Ts",
    "chapters": 3,
    "testament": "NT"
  },
  {
    "slug": "1-timoteo",
    "name": "1 Timóteo",
    "abbrev": "1Tm",
    "chapters": 6,
    "testament": "NT"
  },
  {
    "slug": "2-timoteo",
    "name": "2 Timóteo",
    "abbrev": "2Tm",
    "chapters": 4,
    "testament": "NT"
  },
  {
    "slug": "tito",
    "name": "Tito",
    "abbrev": "Tt",
    "chapters": 3,
    "testament": "NT"
  },
  {
    "slug": "filemom",
    "name": "Filemom",
    "abbrev": "Fm",
    "chapters": 1,
    "testament": "NT"
  },
  {
    "slug": "hebreus",
    "name": "Hebreus",
    "abbrev": "Hb",
    "chapters": 13,
    "testament": "NT"
  },
  {
    "slug": "tiago",
    "name": "Tiago",
    "abbrev": "Tg",
    "chapters": 5,
    "testament": "NT"
  },
  {
    "slug": "1-pedro",
    "name": "1 Pedro",
    "abbrev": "1Pe",
    "chapters": 5,
    "testament": "NT"
  },
  {
    "slug": "2-pedro",
    "name": "2 Pedro",
    "abbrev": "2Pe",
    "chapters": 3,
    "testament": "NT"
  },
  {
    "slug": "1-joao",
    "name": "1 João",
    "abbrev": "1Jo",
    "chapters": 5,
    "testament": "NT"
  },
  {
    "slug": "2-joao",
    "name": "2 João",
    "abbrev": "2Jo",
    "chapters": 1,
    "testament": "NT"
  },
  {
    "slug": "3-joao",
    "name": "3 João",
    "abbrev": "3Jo",
    "chapters": 1,
    "testament": "NT"
  },
  {
    "slug": "judas",
    "name": "Judas",
    "abbrev": "Jd",
    "chapters": 1,
    "testament": "NT"
  },
  {
    "slug": "apocalipse",
    "name": "Apocalipse",
    "abbrev": "Ap",
    "chapters": 22,
    "testament": "NT"
  }
];

/**
 * Um require por livro, resolvido estaticamente pelo Metro mas avaliado
 * apenas na primeira leitura — é o que mantém a inicialização barata.
 */
const LOADERS: Record<string, () => BookChapters> = {
  'genesis': () => require('./blivre/genesis.json') as BookChapters,
  'exodo': () => require('./blivre/exodo.json') as BookChapters,
  'levitico': () => require('./blivre/levitico.json') as BookChapters,
  'numeros': () => require('./blivre/numeros.json') as BookChapters,
  'deuteronomio': () => require('./blivre/deuteronomio.json') as BookChapters,
  'josue': () => require('./blivre/josue.json') as BookChapters,
  'juizes': () => require('./blivre/juizes.json') as BookChapters,
  'rute': () => require('./blivre/rute.json') as BookChapters,
  '1-samuel': () => require('./blivre/1-samuel.json') as BookChapters,
  '2-samuel': () => require('./blivre/2-samuel.json') as BookChapters,
  '1-reis': () => require('./blivre/1-reis.json') as BookChapters,
  '2-reis': () => require('./blivre/2-reis.json') as BookChapters,
  '1-cronicas': () => require('./blivre/1-cronicas.json') as BookChapters,
  '2-cronicas': () => require('./blivre/2-cronicas.json') as BookChapters,
  'esdras': () => require('./blivre/esdras.json') as BookChapters,
  'neemias': () => require('./blivre/neemias.json') as BookChapters,
  'ester': () => require('./blivre/ester.json') as BookChapters,
  'jo': () => require('./blivre/jo.json') as BookChapters,
  'salmos': () => require('./blivre/salmos.json') as BookChapters,
  'proverbios': () => require('./blivre/proverbios.json') as BookChapters,
  'eclesiastes': () => require('./blivre/eclesiastes.json') as BookChapters,
  'canticos': () => require('./blivre/canticos.json') as BookChapters,
  'isaias': () => require('./blivre/isaias.json') as BookChapters,
  'jeremias': () => require('./blivre/jeremias.json') as BookChapters,
  'lamentacoes-de-jeremias': () => require('./blivre/lamentacoes-de-jeremias.json') as BookChapters,
  'ezequiel': () => require('./blivre/ezequiel.json') as BookChapters,
  'daniel': () => require('./blivre/daniel.json') as BookChapters,
  'oseias': () => require('./blivre/oseias.json') as BookChapters,
  'joel': () => require('./blivre/joel.json') as BookChapters,
  'amos': () => require('./blivre/amos.json') as BookChapters,
  'obadias': () => require('./blivre/obadias.json') as BookChapters,
  'jonas': () => require('./blivre/jonas.json') as BookChapters,
  'miqueias': () => require('./blivre/miqueias.json') as BookChapters,
  'naum': () => require('./blivre/naum.json') as BookChapters,
  'habacuque': () => require('./blivre/habacuque.json') as BookChapters,
  'sofonias': () => require('./blivre/sofonias.json') as BookChapters,
  'ageu': () => require('./blivre/ageu.json') as BookChapters,
  'zacarias': () => require('./blivre/zacarias.json') as BookChapters,
  'malaquias': () => require('./blivre/malaquias.json') as BookChapters,
  'mateus': () => require('./blivre/mateus.json') as BookChapters,
  'marcos': () => require('./blivre/marcos.json') as BookChapters,
  'lucas': () => require('./blivre/lucas.json') as BookChapters,
  'joao': () => require('./blivre/joao.json') as BookChapters,
  'atos': () => require('./blivre/atos.json') as BookChapters,
  'romanos': () => require('./blivre/romanos.json') as BookChapters,
  '1-corintios': () => require('./blivre/1-corintios.json') as BookChapters,
  '2-corintios': () => require('./blivre/2-corintios.json') as BookChapters,
  'galatas': () => require('./blivre/galatas.json') as BookChapters,
  'efesios': () => require('./blivre/efesios.json') as BookChapters,
  'filipenses': () => require('./blivre/filipenses.json') as BookChapters,
  'colossenses': () => require('./blivre/colossenses.json') as BookChapters,
  '1-tessalonicenses': () => require('./blivre/1-tessalonicenses.json') as BookChapters,
  '2-tessalonicenses': () => require('./blivre/2-tessalonicenses.json') as BookChapters,
  '1-timoteo': () => require('./blivre/1-timoteo.json') as BookChapters,
  '2-timoteo': () => require('./blivre/2-timoteo.json') as BookChapters,
  'tito': () => require('./blivre/tito.json') as BookChapters,
  'filemom': () => require('./blivre/filemom.json') as BookChapters,
  'hebreus': () => require('./blivre/hebreus.json') as BookChapters,
  'tiago': () => require('./blivre/tiago.json') as BookChapters,
  '1-pedro': () => require('./blivre/1-pedro.json') as BookChapters,
  '2-pedro': () => require('./blivre/2-pedro.json') as BookChapters,
  '1-joao': () => require('./blivre/1-joao.json') as BookChapters,
  '2-joao': () => require('./blivre/2-joao.json') as BookChapters,
  '3-joao': () => require('./blivre/3-joao.json') as BookChapters,
  'judas': () => require('./blivre/judas.json') as BookChapters,
  'apocalipse': () => require('./blivre/apocalipse.json') as BookChapters,
};

export function loadBookChapters(slug: string): BookChapters | null {
  const loader = LOADERS[slug];
  return loader ? loader() : null;
}

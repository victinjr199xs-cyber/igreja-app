import { BIBLE_BOOKS, BibleBook, Testament } from './books';

// books.ts é gerado; o agrupamento fica aqui. BIBLE_BOOKS está na ordem
// canônica, então cada categoria é uma faixa contínua de livros.
const RANGES: { name: string; testament: Testament; from: string; to: string }[] = [
  { name: 'Pentateuco', testament: 'AT', from: 'genesis', to: 'deuteronomio' },
  { name: 'Históricos', testament: 'AT', from: 'josue', to: 'ester' },
  { name: 'Poéticos', testament: 'AT', from: 'jo', to: 'canticos' },
  { name: 'Profetas Maiores', testament: 'AT', from: 'isaias', to: 'daniel' },
  { name: 'Profetas Menores', testament: 'AT', from: 'oseias', to: 'malaquias' },
  { name: 'Evangelhos', testament: 'NT', from: 'mateus', to: 'joao' },
  { name: 'Histórico', testament: 'NT', from: 'atos', to: 'atos' },
  { name: 'Cartas de Paulo', testament: 'NT', from: 'romanos', to: 'filemom' },
  { name: 'Cartas Gerais', testament: 'NT', from: 'hebreus', to: 'judas' },
  { name: 'Profecia', testament: 'NT', from: 'apocalipse', to: 'apocalipse' },
];

export interface BookCategory {
  name: string;
  testament: Testament;
  books: BibleBook[];
}

const indexOf = (slug: string) => BIBLE_BOOKS.findIndex((b) => b.slug === slug);

export const BOOK_CATEGORIES: BookCategory[] = RANGES.map((r) => ({
  name: r.name,
  testament: r.testament,
  books: BIBLE_BOOKS.slice(indexOf(r.from), indexOf(r.to) + 1),
}));

const CATEGORY_BY_SLUG = new Map(
  BOOK_CATEGORIES.flatMap((c) => c.books.map((b) => [b.slug, c.name] as const))
);

export const categoryOf = (book: BibleBook) => CATEGORY_BY_SLUG.get(book.slug) ?? '';

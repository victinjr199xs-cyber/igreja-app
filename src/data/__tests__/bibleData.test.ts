import { DAILY_VERSES, verseOfDay } from '../dailyVerses';
import { BIBLE_BOOKS, loadBookChapters } from '../bible/books';
import { BOOK_CATEGORIES, categoryOf } from '../bible/categories';

describe('Bíblia embutida', () => {
  it('tem os 66 livros', () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(BIBLE_BOOKS.filter((b) => b.testament === 'AT')).toHaveLength(39);
  });

  it('carrega cada livro com o número certo de capítulos', () => {
    for (const book of BIBLE_BOOKS) {
      expect(loadBookChapters(book.slug)).toHaveLength(book.chapters);
    }
  });

  it('põe cada livro em exatamente uma categoria', () => {
    const all = BOOK_CATEGORIES.flatMap((c) => c.books.map((b) => b.slug));
    expect(all).toHaveLength(66);
    expect(new Set(all).size).toBe(66);
    expect(categoryOf(BIBLE_BOOKS.find((b) => b.slug === 'salmos')!)).toBe('Poéticos');
  });
});

describe('versículo do dia', () => {
  it('tem versículos para mais de um ano, sem repetir', () => {
    expect(DAILY_VERSES.length).toBeGreaterThanOrEqual(366);
    expect(new Set(DAILY_VERSES.map((v) => v.reference)).size).toBe(DAILY_VERSES.length);
  });

  it('cada texto é o da Bíblia embutida (abre no capítulo certo)', () => {
    for (const v of DAILY_VERSES) {
      const chapters = loadBookChapters(v.slug)!;
      expect(chapters[v.chapter - 1][v.verse - 1].replace(/\s+/g, ' ').trim()).toBe(v.text);
    }
  });

  it('é o mesmo o dia inteiro e muda à meia-noite', () => {
    const morning = verseOfDay(new Date(2026, 8, 29, 0, 1));
    expect(verseOfDay(new Date(2026, 8, 29, 23, 59))).toBe(morning);
    expect(verseOfDay(new Date(2026, 8, 30, 0, 1))).not.toBe(morning);
  });

  it('não repete em dias seguidos durante a lista inteira', () => {
    const refs = new Set<string>();
    for (let i = 0; i < DAILY_VERSES.length; i++) {
      refs.add(verseOfDay(new Date(2026, 0, 1 + i)).reference);
    }
    expect(refs.size).toBe(DAILY_VERSES.length);
  });

  it('não recomeça em 1º de janeiro', () => {
    expect(verseOfDay(new Date(2027, 0, 1))).not.toBe(verseOfDay(new Date(2026, 0, 1)));
  });
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import {
  useSettings,
  useThemedStyles,
  BIBLE_FONT_MAX,
  BIBLE_FONT_MIN,
} from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';
import { verseOfDay } from '../data/dailyVerses';
import { BIBLE_BOOKS, BibleBook, Testament, loadBookChapters } from '../data/bible/books';
import { BOOK_CATEGORIES, categoryOf } from '../data/bible/categories';
import { foldText } from '../utils/format';
import { useNow } from '../hooks/useNow';
import { onAppEvent } from '../services/appEvents';

const LAST_READ_KEY = 'bible:last';

interface Position {
  slug: string;
  chapter: number;
}

const bookBySlug = (slug: string) => BIBLE_BOOKS.find((b) => b.slug === slug) ?? null;

/** Capítulo anterior/seguinte, atravessando de um livro para o outro. */
function neighbor(book: BibleBook, chapter: number, step: 1 | -1): Position | null {
  if (step === 1 && chapter < book.chapters) return { slug: book.slug, chapter: chapter + 1 };
  if (step === -1 && chapter > 1) return { slug: book.slug, chapter: chapter - 1 };
  const other = BIBLE_BOOKS[BIBLE_BOOKS.indexOf(book) + step];
  if (!other) return null;
  return { slug: other.slug, chapter: step === 1 ? 1 : other.chapters };
}

export default function BibleScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { settings, update } = useSettings();
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const fontSize = settings.bibleFontSize;

  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [testament, setTestament] = useState<Testament>('AT');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRead, setLastRead] = useState<Position | null>(null);
  const [showFontPanel, setShowFontPanel] = useState(false);
  const readerRef = useRef<ScrollView>(null);

  // Troca à meia-noite mesmo com a aba aberta (ou o app voltando no dia seguinte).
  const today = useNow('day');
  const dailyVerse = useMemo(() => verseOfDay(today), [today]);

  // A vista atual é derivada da seleção, e não guardada à parte, para as duas
  // não saírem de sincronia.
  const view = selectedChapter !== null ? 'reading' : selectedBook ? 'chapters' : 'books';

  useEffect(() => {
    AsyncStorage.getItem(LAST_READ_KEY)
      .then((raw) => raw && setLastRead(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  // "Limpar dados salvos" (Configurações) apagou o "continuar lendo".
  useEffect(() => onAppEvent('personal-data-cleared', () => setLastRead(null)), []);

  // Guarda onde a pessoa parou, para o "Continuar lendo".
  useEffect(() => {
    if (!selectedBook || selectedChapter === null) return;
    const pos = { slug: selectedBook.slug, chapter: selectedChapter };
    setLastRead(pos);
    AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(pos)).catch(() => {});
    readerRef.current?.scrollTo({ y: 0, animated: false });
  }, [selectedBook, selectedChapter]);

  // O JSON do livro só é lido na primeira vez que ele é aberto.
  const chapters = useMemo(
    () => (selectedBook ? loadBookChapters(selectedBook.slug) : null),
    [selectedBook]
  );
  const verses = selectedChapter !== null && chapters ? chapters[selectedChapter - 1] : null;

  // Sem acento dos dois lados: "genesis", "joao" e "isaias" acham o livro.
  const query = foldText(searchQuery);
  const categories = useMemo(() => {
    // Buscando, mostra os dois testamentos; senão, só a aba escolhida.
    return BOOK_CATEGORIES.map((c) => ({
      ...c,
      books: c.books.filter((b) =>
        query ? foldText(b.name).includes(query) || foldText(b.abbrev) === query : true
      ),
    })).filter((c) => c.books.length > 0 && (query || c.testament === testament));
  }, [query, testament]);

  const openPosition = (pos: Position) => {
    const book = bookBySlug(pos.slug);
    if (!book) return;
    setSelectedBook(book);
    // Posição gravada ou vinda de fora pode estar fora do livro: abriria vazio.
    const chapter = Number.isInteger(pos.chapter) ? pos.chapter : 1;
    setSelectedChapter(Math.min(Math.max(1, chapter), book.chapters));
  };

  // Vindo do "continue de onde parou" da Início: abre direto no capítulo.
  const openParam = (route.params as { open?: Position } | undefined)?.open;
  useEffect(() => {
    if (!openParam) return;
    openPosition(openParam);
    navigation.setParams({ open: undefined });
  }, [openParam]);

  const backToBooks = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    setShowFontPanel(false);
  };

  const changeFont = (delta: number) => {
    const next = Math.min(BIBLE_FONT_MAX, Math.max(BIBLE_FONT_MIN, fontSize + delta));
    update({ bibleFontSize: next });
  };

  const lastBook = lastRead ? bookBySlug(lastRead.slug) : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bíblia Sagrada" subtitle="Bíblia Livre · domínio público" />

      {view === 'books' && (
        <ScrollView
          contentContainerStyle={styles.booksContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {lastRead && lastBook && !query && (
            <TouchableOpacity
              style={styles.continueCard}
              activeOpacity={0.85}
              onPress={() => openPosition(lastRead)}
            >
              <Ionicons name="bookmark" size={24} color={colors.white} />
              <View style={styles.continueInfo}>
                <Text style={styles.continueLabel}>CONTINUAR LENDO</Text>
                <Text style={styles.continueTitle}>
                  {lastBook.name} {lastRead.chapter}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={22} color={colors.white} />
            </TouchableOpacity>
          )}

          {!query && (
            <TouchableOpacity
              style={styles.verseCard}
              activeOpacity={0.8}
              onPress={() => openPosition({ slug: dailyVerse.slug, chapter: dailyVerse.chapter })}
            >
              <View style={styles.verseHeader}>
                <Ionicons name="sparkles" size={16} color={colors.gold} />
                <Text style={styles.verseLabel}>Versículo do dia</Text>
              </View>
              <Text style={styles.verseText}>{dailyVerse.text}</Text>
              <Text style={styles.verseReference}>{dailyVerse.reference} · ler o capítulo ›</Text>
            </TouchableOpacity>
          )}

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar livro (ex.: Salmos, Jo)"
              placeholderTextColor={colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.gray} />
              </TouchableOpacity>
            )}
          </View>

          {!query && (
            <View style={styles.segment}>
              {(['AT', 'NT'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.segmentItem, testament === t && styles.segmentItemActive]}
                  onPress={() => setTestament(t)}
                >
                  <Text style={[styles.segmentText, testament === t && styles.segmentTextActive]}>
                    {t === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {categories.map((category) => (
            <View key={category.name} style={styles.category}>
              <Text style={styles.categoryTitle}>{category.name.toUpperCase()}</Text>
              <View style={styles.grid}>
                {category.books.map((book) => (
                  <View key={book.slug} style={styles.gridCell}>
                    <TouchableOpacity
                      style={styles.bookTile}
                      onPress={() => {
                        setSelectedBook(book);
                        setSelectedChapter(null);
                      }}
                    >
                      <Text style={styles.bookAbbrev}>{book.abbrev}</Text>
                      <Text style={styles.bookName} numberOfLines={1}>
                        {book.name}
                      </Text>
                      <Text style={styles.bookChapters}>
                        {book.chapters} {book.chapters === 1 ? 'cap.' : 'caps.'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {categories.length === 0 && (
            <Text style={styles.emptyText}>Nenhum livro encontrado.</Text>
          )}
        </ScrollView>
      )}

      {view === 'chapters' && selectedBook && (
        <>
          <View style={styles.bar}>
            <TouchableOpacity onPress={backToBooks} style={styles.barBack} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.barInfo}>
              <Text style={styles.barTitle}>{selectedBook.name}</Text>
              <Text style={styles.barSubtitle}>
                {categoryOf(selectedBook)} · {selectedBook.chapters}{' '}
                {selectedBook.chapters === 1 ? 'capítulo' : 'capítulos'}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.chapterGrid}>
            {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((n) => {
              const isLast = lastRead?.slug === selectedBook.slug && lastRead.chapter === n;
              return (
                <View key={n} style={styles.chapterCell}>
                  <TouchableOpacity
                    style={[styles.chapterItem, isLast && styles.chapterItemLast]}
                    onPress={() => setSelectedChapter(n)}
                  >
                    <Text style={[styles.chapterNumber, isLast && styles.chapterNumberLast]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {view === 'reading' && selectedBook && selectedChapter !== null && (
        <>
          <View style={styles.bar}>
            <TouchableOpacity
              onPress={() => {
                setSelectedChapter(null);
                setShowFontPanel(false);
              }}
              style={styles.barBack}
              hitSlop={8}
              accessibilityLabel="Voltar aos capítulos"
            >
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.barInfo} onPress={() => setSelectedChapter(null)}>
              <Text style={styles.barTitle}>
                {selectedBook.name} {selectedChapter}
              </Text>
              <Text style={styles.barSubtitle}>
                {verses?.length ?? 0} versículos · toque para trocar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fontButton, showFontPanel && styles.fontButtonActive]}
              onPress={() => setShowFontPanel((v) => !v)}
              accessibilityLabel="Tamanho do texto"
            >
              <Text style={[styles.fontButtonText, showFontPanel && styles.fontButtonTextActive]}>
                Aa
              </Text>
            </TouchableOpacity>
          </View>

          {showFontPanel && (
            <View style={styles.fontPanel}>
              <TouchableOpacity
                style={styles.fontStep}
                onPress={() => changeFont(-2)}
                disabled={fontSize <= BIBLE_FONT_MIN}
              >
                <Text style={[styles.fontStepText, { fontSize: 14 }]}>A−</Text>
              </TouchableOpacity>
              <Text style={styles.fontValue}>{fontSize} pt</Text>
              <TouchableOpacity
                style={styles.fontStep}
                onPress={() => changeFont(2)}
                disabled={fontSize >= BIBLE_FONT_MAX}
              >
                <Text style={[styles.fontStepText, { fontSize: 20 }]}>A+</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView ref={readerRef} contentContainerStyle={styles.readerContent}>
            <Text style={styles.readerBook}>{selectedBook.name.toUpperCase()}</Text>
            <Text style={styles.readerChapter}>{selectedChapter}</Text>

            {/* Um parágrafo corrido, com o número do versículo em destaque,
                como numa Bíblia impressa. */}
            <Text
              style={[styles.readerText, { fontSize, lineHeight: Math.round(fontSize * 1.7) }]}
              selectable
            >
              {(verses ?? []).map((verse, i) => (
                <Text key={i}>
                  <Text style={[styles.verseNum, { fontSize: Math.round(fontSize * 0.62) }]}>
                    {i + 1}
                    {' '}
                  </Text>
                  {verse}{' '}
                </Text>
              ))}
            </Text>

            <View style={styles.readerNav}>
              {(() => {
                const prev = neighbor(selectedBook, selectedChapter, -1);
                const next = neighbor(selectedBook, selectedChapter, 1);
                const label = (p: Position) => `${bookBySlug(p.slug)?.name} ${p.chapter}`;
                return (
                  <>
                    <TouchableOpacity
                      style={[styles.navButton, !prev && styles.navHidden]}
                      disabled={!prev}
                      onPress={() => prev && openPosition(prev)}
                    >
                      <Ionicons name="chevron-back" size={18} color={colors.primary} />
                      <Text style={styles.navText} numberOfLines={1}>
                        {prev ? label(prev) : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navButton, styles.navNext, !next && styles.navHidden]}
                      disabled={!next}
                      onPress={() => next && openPosition(next)}
                    >
                      <Text style={styles.navTextNext} numberOfLines={1}>
                        {next ? label(next) : ''}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.white} />
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    booksContent: {
      padding: SIZES.padding,
      paddingBottom: 32,
    },
    continueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.primary,
      borderRadius: SIZES.radius,
      padding: SIZES.padding,
      marginBottom: 12,
    },
    continueInfo: {
      flex: 1,
      marginLeft: 12,
    },
    continueLabel: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.white + 'CC',
    },
    continueTitle: {
      ...FONTS.bold,
      fontSize: SIZES.xl,
      color: c.white,
      marginTop: 2,
    },
    verseCard: {
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: SIZES.padding,
      borderLeftWidth: 4,
      borderLeftColor: c.gold,
      marginBottom: 12,
    },
    verseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    verseLabel: {
      ...FONTS.medium,
      fontSize: SIZES.small,
      color: c.gold,
    },
    verseText: {
      ...FONTS.regular,
      fontSize: SIZES.medium,
      fontStyle: 'italic',
      color: c.text,
      lineHeight: 24,
    },
    verseReference: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.primary,
      marginTop: 8,
      textAlign: 'right',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      height: 46,
      marginBottom: 12,
    },
    searchInput: {
      ...FONTS.regular,
      flex: 1,
      marginLeft: 10,
      fontSize: SIZES.medium,
      color: c.text,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: 4,
      marginBottom: 4,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: SIZES.radius - 4,
      alignItems: 'center',
    },
    segmentItemActive: {
      backgroundColor: c.primary,
    },
    segmentText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.textLight,
    },
    segmentTextActive: {
      color: c.white,
    },
    category: {
      marginTop: 16,
    },
    categoryTitle: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      letterSpacing: 1,
      marginBottom: 8,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    gridCell: {
      width: '33.333%',
      padding: 4,
    },
    bookTile: {
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    bookAbbrev: {
      ...FONTS.bold,
      fontSize: SIZES.extraLarge,
      color: c.primary,
    },
    bookName: {
      ...FONTS.medium,
      fontSize: SIZES.small,
      color: c.text,
      marginTop: 2,
    },
    bookChapters: {
      ...FONTS.mono,
      fontSize: 10,
      color: c.textLight,
      marginTop: 2,
    },
    emptyText: {
      ...FONTS.regular,
      textAlign: 'center',
      color: c.textLight,
      fontSize: SIZES.font,
      marginTop: 32,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    barBack: {
      paddingRight: 6,
    },
    barInfo: {
      flex: 1,
    },
    barTitle: {
      ...FONTS.bold,
      fontSize: SIZES.large,
      color: c.text,
    },
    barSubtitle: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      marginTop: 1,
    },
    chapterGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: SIZES.padding - 4,
      paddingBottom: 32,
    },
    chapterCell: {
      width: '16.666%',
      padding: 4,
    },
    chapterItem: {
      aspectRatio: 1,
      backgroundColor: c.card,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    chapterItemLast: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chapterNumber: {
      ...FONTS.medium,
      fontSize: SIZES.medium,
      color: c.text,
    },
    chapterNumberLast: {
      color: c.white,
    },
    fontButton: {
      width: 40,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    fontButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    fontButtonText: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.primary,
    },
    fontButtonTextActive: {
      color: c.white,
    },
    fontPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      backgroundColor: c.card,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    fontStep: {
      width: 56,
      height: 40,
      borderRadius: 8,
      backgroundColor: c.lightGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontStepText: {
      ...FONTS.bold,
      color: c.text,
    },
    fontValue: {
      ...FONTS.mono,
      fontSize: SIZES.font,
      color: c.textLight,
      minWidth: 48,
      textAlign: 'center',
    },
    readerContent: {
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 40,
    },
    readerBook: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      letterSpacing: 2,
      textAlign: 'center',
    },
    readerChapter: {
      ...FONTS.bold,
      fontSize: 56,
      color: c.primary,
      textAlign: 'center',
      marginBottom: 12,
    },
    readerText: {
      ...FONTS.regular,
      color: c.text,
    },
    verseNum: {
      ...FONTS.bold,
      color: c.primary,
    },
    readerNav: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 32,
    },
    navButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 14,
      paddingHorizontal: 10,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    navNext: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    navHidden: {
      opacity: 0,
    },
    navText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
      flexShrink: 1,
    },
    navTextNext: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.white,
      flexShrink: 1,
    },
  });

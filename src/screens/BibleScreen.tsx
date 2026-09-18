import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { DAILY_VERSES, BibleVerse } from '../data/churchData';
import { BIBLE_BOOKS, BibleBook, loadBookChapters } from '../data/bible/books';

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyVerse] = useState<BibleVerse>(
    () => DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length]
  );

  // A vista atual é derivada da seleção, e não guardada à parte, para as duas
  // não saírem de sincronia.
  const view = selectedChapter !== null ? 'reading' : selectedBook ? 'chapters' : 'books';

  // O JSON do livro só é lido na primeira vez que ele é aberto.
  const chapters = useMemo(
    () => (selectedBook ? loadBookChapters(selectedBook.slug) : null),
    [selectedBook]
  );

  const verses = selectedChapter !== null && chapters ? chapters[selectedChapter - 1] : null;

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return BIBLE_BOOKS;
    return BIBLE_BOOKS.filter((book) => book.name.toLowerCase().includes(query));
  }, [searchQuery]);

  const backToBooks = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
  };

  const goToChapter = (chapter: number) => {
    if (!selectedBook || chapter < 1 || chapter > selectedBook.chapters) return;
    setSelectedChapter(chapter);
  };

  const renderBook = ({ item }: { item: BibleBook }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => {
        setSelectedBook(item);
        setSelectedChapter(null);
      }}
    >
      <View style={styles.bookIcon}>
        <Ionicons name="book-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookName}>{item.name}</Text>
        <Text style={styles.bookChapters}>
          {item.chapters} {item.chapters === 1 ? 'capítulo' : 'capítulos'} · {item.testament}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
    </TouchableOpacity>
  );

  const renderChapter = ({ item }: { item: number }) => (
    <TouchableOpacity style={styles.chapterItem} onPress={() => goToChapter(item)}>
      <Text style={styles.chapterNumber}>{item}</Text>
    </TouchableOpacity>
  );

  const renderVerse = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.verseRow}>
      <Text style={styles.verseNumber}>{index + 1}</Text>
      <Text style={styles.verseBody} selectable>
        {item}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bíblia Sagrada</Text>
        <Text style={styles.headerSubtitle}>Bíblia Livre · domínio público</Text>
      </View>

      {view === 'books' && (
        <>
          <View style={styles.dailyVerseCard}>
            <View style={styles.verseHeader}>
              <Ionicons name="sparkles" size={20} color={COLORS.gold} />
              <Text style={styles.verseLabel}>Versículo do Dia</Text>
            </View>
            <Text style={styles.verseText}>{dailyVerse.text}</Text>
            <Text style={styles.verseReference}>— {dailyVerse.reference}</Text>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar livro..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredBooks}
            renderItem={renderBook}
            keyExtractor={(item) => item.slug}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum livro encontrado.</Text>
            }
          />
        </>
      )}

      {view === 'chapters' && selectedBook && (
        <>
          <View style={styles.breadcrumb}>
            <TouchableOpacity onPress={backToBooks}>
              <Text style={styles.breadcrumbText}>Livros</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={14} color={COLORS.gray} />
            <Text style={styles.breadcrumbCurrent}>{selectedBook.name}</Text>
          </View>

          <View style={styles.chapterSection}>
            <Text style={styles.chapterTitle}>Escolha o capítulo</Text>
            <FlatList
              data={Array.from({ length: selectedBook.chapters }, (_, i) => i + 1)}
              renderItem={renderChapter}
              keyExtractor={(item) => String(item)}
              numColumns={5}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chapterGrid}
            />
          </View>
        </>
      )}

      {view === 'reading' && selectedBook && selectedChapter !== null && (
        <>
          <View style={styles.readerBar}>
            <TouchableOpacity
              style={styles.readerBack}
              onPress={() => setSelectedChapter(null)}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.readerTitleArea} onPress={backToBooks}>
              <Text style={styles.readerTitle} numberOfLines={1}>
                {selectedBook.name} {selectedChapter}
              </Text>
              <Text style={styles.readerSubtitle}>{verses?.length ?? 0} versículos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.readerNav}
              disabled={selectedChapter <= 1}
              onPress={() => goToChapter(selectedChapter - 1)}
            >
              <Ionicons
                name="arrow-back-circle"
                size={30}
                color={selectedChapter <= 1 ? COLORS.border : COLORS.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.readerNav}
              disabled={selectedChapter >= selectedBook.chapters}
              onPress={() => goToChapter(selectedChapter + 1)}
            >
              <Ionicons
                name="arrow-forward-circle"
                size={30}
                color={
                  selectedChapter >= selectedBook.chapters ? COLORS.border : COLORS.primary
                }
              />
            </TouchableOpacity>
          </View>

          <FlatList
            data={verses ?? []}
            renderItem={renderVerse}
            keyExtractor={(_, index) => String(index)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.readerContent}
            ListFooterComponent={
              selectedChapter < selectedBook.chapters ? (
                <TouchableOpacity
                  style={styles.nextChapterButton}
                  onPress={() => goToChapter(selectedChapter + 1)}
                >
                  <Text style={styles.nextChapterText}>
                    {selectedBook.name} {selectedChapter + 1}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </TouchableOpacity>
              ) : null
            }
          />
        </>
      )}

      {view === 'books' && (
        <View style={styles.readingReminder}>
          <Ionicons name="notifications" size={20} color={COLORS.secondary} />
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>Lembrete de Leitura</Text>
            <Text style={styles.reminderText}>Ativado · Todos os dias às 19:00</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.font,
    color: COLORS.white + 'CC',
    marginTop: 4,
  },
  dailyVerseCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    borderRadius: SIZES.radius,
    padding: 20,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  verseLabel: {
    fontSize: SIZES.font,
    fontWeight: '700',
    color: COLORS.gold,
  },
  verseText: {
    fontSize: SIZES.large,
    fontStyle: 'italic',
    color: COLORS.text,
    lineHeight: 28,
  },
  verseReference: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 12,
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding,
    marginBottom: 12,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    marginBottom: 8,
    gap: 4,
  },
  breadcrumbText: {
    fontSize: SIZES.font,
    color: COLORS.primary,
    fontWeight: '600',
  },
  breadcrumbCurrent: {
    fontSize: SIZES.font,
    color: COLORS.text,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: SIZES.font,
    marginTop: 32,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 8,
  },
  bookIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookName: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
  },
  bookChapters: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  chapterSection: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  chapterTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  chapterGrid: {
    paddingBottom: 24,
  },
  chapterItem: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '18%',
  },
  chapterNumber: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
  },
  readerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  readerBack: {
    paddingRight: 8,
  },
  readerTitleArea: {
    flex: 1,
  },
  readerTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: COLORS.text,
  },
  readerSubtitle: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  readerNav: {
    paddingLeft: 10,
  },
  readerContent: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  verseNumber: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.secondary,
    width: 28,
    paddingTop: 3,
  },
  verseBody: {
    flex: 1,
    fontSize: SIZES.medium,
    color: COLORS.text,
    lineHeight: 26,
  },
  nextChapterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    marginTop: 12,
  },
  nextChapterText: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.white,
  },
  readingReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    margin: SIZES.padding,
    borderRadius: SIZES.radius,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  reminderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: COLORS.text,
  },
  reminderText: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
});

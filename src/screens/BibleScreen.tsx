import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { DAILY_VERSES, BIBLE_BOOKS, BibleVerse } from '../data/churchData';

export default function BibleScreen() {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookList, setShowBookList] = useState(true);
  const [dailyVerse] = useState<BibleVerse>(
    () => DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length]
  );

  const filteredBooks = BIBLE_BOOKS.filter((book) =>
    book.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedBookData = BIBLE_BOOKS.find((b) => b.name === selectedBook);

  const renderBook = ({ item }: { item: typeof BIBLE_BOOKS[0] }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => {
        setSelectedBook(item.name);
        setShowBookList(false);
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
    <TouchableOpacity
      style={[
        styles.chapterItem,
        selectedChapter === item && styles.chapterItemActive,
      ]}
      onPress={() => setSelectedChapter(item)}
    >
      <Text
        style={[
          styles.chapterNumber,
          selectedChapter === item && styles.chapterNumberActive,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bíblia Sagrada</Text>
        <Text style={styles.headerSubtitle}>Leitura diária</Text>
      </View>

      <View style={styles.dailyVerseCard}>
        <View style={styles.verseHeader}>
          <Ionicons name="sparkles" size={20} color={COLORS.gold} />
          <Text style={styles.verseLabel}>Versículo do Dia</Text>
        </View>
        <Text style={styles.verseText}>"{dailyVerse.text}"</Text>
        <Text style={styles.verseReference}>— {dailyVerse.reference}</Text>
        <View style={styles.verseActions}>
          <TouchableOpacity style={styles.verseAction}>
            <Ionicons name="share-outline" size={18} color={COLORS.primary} />
            <Text style={styles.verseActionText}>Compartilhar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.verseAction}>
            <Ionicons name="bookmark-outline" size={18} color={COLORS.primary} />
            <Text style={styles.verseActionText}>Salvar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.verseAction}>
            <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
            <Text style={styles.verseActionText}>Copiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar livro..."
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.length > 0) {
              setShowBookList(true);
            }
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {!showBookList && selectedBook && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity
            onPress={() => {
              setShowBookList(true);
              setSelectedBook(null);
              setSelectedChapter(null);
            }}
          >
            <Text style={styles.breadcrumbText}>Livros</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={14} color={COLORS.gray} />
          <Text style={styles.breadcrumbCurrent}>{selectedBook}</Text>
          {selectedChapter && (
            <>
              <Ionicons name="chevron-forward" size={14} color={COLORS.gray} />
              <Text style={styles.breadcrumbCurrent}>Cap. {selectedChapter}</Text>
            </>
          )}
        </View>
      )}

      {showBookList ? (
        <FlatList
          data={filteredBooks}
          renderItem={renderBook}
          keyExtractor={(item) => item.name}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.chapterSection}>
          <Text style={styles.chapterTitle}>Capítulos</Text>
          <FlatList
            data={Array.from({ length: selectedBookData?.chapters || 0 }, (_, i) => i + 1)}
            renderItem={renderChapter}
            keyExtractor={(item) => item.toString()}
            numColumns={5}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chapterGrid}
          />
        </View>
      )}

      <View style={styles.readingReminder}>
        <Ionicons name="notifications" size={20} color={COLORS.secondary} />
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>Lembrete de Leitura</Text>
          <Text style={styles.reminderText}>
            Ativado · Todos os dias às 19:00
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
      </View>
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
  verseActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  verseAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verseActionText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '600',
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
    paddingBottom: 80,
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
    paddingBottom: 80,
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
  chapterItemActive: {
    backgroundColor: COLORS.primary,
  },
  chapterNumber: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.text,
  },
  chapterNumberActive: {
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

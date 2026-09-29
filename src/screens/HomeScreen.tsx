import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ChurchLogo from '../components/ChurchLogo';
import { DAILY_VERSES, WEEKLY_EVENTS, getNextEvent } from '../data/churchData';
import { fetchCultos, Video } from '../services/youtubeService';

const INSTAGRAM_URL = 'https://www.instagram.com/casadeadoracaooficial/';
const YOUTUBE_URL = 'https://www.youtube.com/@casadeadoracaoofficial';

const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const QUICK_LINKS: { tab: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { tab: 'Pregações', label: 'Pregações', icon: 'play-circle-outline' },
  { tab: 'Rádio', label: 'Rádio', icon: 'radio-outline' },
  { tab: 'Bíblia', label: 'Bíblia', icon: 'book-outline' },
  { tab: 'Calendário', label: 'Programação', icon: 'calendar-outline' },
];

function describeWhen(date: Date, now: Date): string {
  const time = date.toTimeString().slice(0, 5);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
  if (days === 0) return `Hoje, às ${time}`;
  if (days === 1) return `Amanhã, às ${time}`;
  return `${DAYS_FULL[date.getDay()]}, às ${time}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function HomeScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [now] = useState(() => new Date());
  const [latest, setLatest] = useState<Video | null>(null);

  const next = getNextEvent(now);
  const verse = DAILY_VERSES[now.getDay() % DAILY_VERSES.length];

  useEffect(() => {
    // Mesma busca (e cache) da aba Pregações. Sem chave ou sem rede, o card
    // simplesmente não aparece.
    fetchCultos()
      .then((page) => setLatest(page.videos[0] ?? null))
      .catch(() => {});
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >

      <View style={[styles.hero, { paddingTop: insets.top + 32 }]}>
        <TouchableOpacity
          style={[styles.settingsButton, { top: insets.top + 8 }]}
          onPress={() => navigation.navigate('Configurações')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <ChurchLogo size="large" align="center" />
        {/* Como no banner: horários com a barra vinho à esquerda. */}
        <View style={styles.schedule}>
          <View style={styles.scheduleBar} />
          <View>
            {WEEKLY_EVENTS.map((e) => (
              <Text key={e.id} style={styles.scheduleText}>
                {DAYS_FULL[e.day]} {e.startTime.replace(':00', '')}h
              </Text>
            ))}
          </View>
        </View>
      </View>

      {next && (
        <TouchableOpacity
          style={[styles.card, styles.nextCard]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Calendário')}
        >
          <Ionicons name="time-outline" size={28} color={colors.white} />
          <View style={styles.nextInfo}>
            <Text style={styles.nextLabel}>PRÓXIMO CULTO</Text>
            <Text style={styles.nextTitle}>{describeWhen(next.date, now)}</Text>
            <Text style={styles.nextPlace}>{next.event.location}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.card, styles.verseCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="sparkles" size={18} color={colors.gold} />
          <Text style={styles.cardLabel}>Versículo do dia</Text>
        </View>
        <Text style={styles.verseText}>{verse.text}</Text>
        <Text style={styles.verseRef}>— {verse.reference}</Text>
      </View>

      {latest && (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Pregações')}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="play-circle" size={18} color={colors.primary} />
            <Text style={styles.cardLabel}>Última ministração</Text>
          </View>
          {latest.thumbnail && (
            <View>
              <Image source={{ uri: latest.thumbnail }} style={styles.thumb} />
              <View style={styles.playOverlay}>
                <Ionicons name="play" size={28} color={colors.white} />
              </View>
            </View>
          )}
          <Text style={styles.videoTitle} numberOfLines={2}>
            {latest.title}
          </Text>
          <Text style={styles.videoDate}>{formatDate(latest.publishedAt)}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Acesso rápido</Text>
      <View style={styles.grid}>
        {QUICK_LINKS.map((link) => (
          <View key={link.tab} style={styles.gridCell}>
            <TouchableOpacity style={styles.gridTile} onPress={() => navigation.navigate(link.tab)}>
              <Ionicons name={link.icon} size={28} color={colors.primary} />
              <Text style={styles.gridLabel}>{link.label}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Siga a igreja</Text>
      <View style={styles.social}>
        <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL(INSTAGRAM_URL)}>
          <Ionicons name="logo-instagram" size={20} color={colors.primary} />
          <Text style={styles.socialText}>@casadeadoracaooficial</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} onPress={() => Linking.openURL(YOUTUBE_URL)}>
          <Ionicons name="logo-youtube" size={20} color={colors.primary} />
          <Text style={styles.socialText}>Canal no YouTube</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  hero: {
    backgroundColor: c.surface,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  settingsButton: {
    position: 'absolute',
    right: SIZES.padding,
  },
  schedule: {
    flexDirection: 'row',
    marginTop: 24,
  },
  scheduleBar: {
    width: 3,
    backgroundColor: c.primary,
    marginRight: 10,
  },
  scheduleText: {
    ...FONTS.bold,
    fontSize: SIZES.large,
    color: c.text,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  nextCard: {
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextInfo: {
    marginLeft: 14,
    flex: 1,
  },
  nextLabel: {
    ...FONTS.mono,
    fontSize: SIZES.small,
    color: c.white + 'CC',
  },
  nextTitle: {
    ...FONTS.bold,
    fontSize: SIZES.xl,
    color: c.white,
    marginTop: 2,
  },
  nextPlace: {
    ...FONTS.regular,
    fontSize: SIZES.font,
    color: c.white + 'CC',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardLabel: {
    ...FONTS.medium,
    fontSize: SIZES.font,
    color: c.textLight,
  },
  verseCard: {
    borderLeftWidth: 4,
    borderLeftColor: c.gold,
  },
  verseText: {
    ...FONTS.regular,
    fontSize: SIZES.medium,
    lineHeight: 24,
    color: c.text,
    fontStyle: 'italic',
  },
  verseRef: {
    ...FONTS.mono,
    fontSize: SIZES.small,
    color: c.primary,
    marginTop: 8,
    textAlign: 'right',
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: c.lightGray,
  },
  playOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.primary + 'E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    ...FONTS.bold,
    fontSize: SIZES.medium,
    color: c.text,
    marginTop: 10,
  },
  videoDate: {
    ...FONTS.mono,
    fontSize: SIZES.small,
    color: c.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    ...FONTS.bold,
    fontSize: SIZES.large,
    color: c.text,
    marginHorizontal: SIZES.padding,
    marginTop: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.padding - 6,
    marginTop: 6,
  },
  gridCell: {
    width: '50%',
    padding: 6,
  },
  gridTile: {
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  gridLabel: {
    ...FONTS.medium,
    fontSize: SIZES.font,
    color: c.text,
    marginTop: 6,
  },
  social: {
    paddingHorizontal: SIZES.padding,
    marginTop: 10,
    gap: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
  },
  socialText: {
    ...FONTS.medium,
    fontSize: SIZES.font,
    color: c.text,
  },
});

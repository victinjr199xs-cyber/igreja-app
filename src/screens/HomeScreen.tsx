import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ChurchLogo from '../components/ChurchLogo';
import ChurchContactCard from '../components/ChurchContactCard';
import Avatar from '../components/Avatar';
import {
  CHURCH_INFO,
  WEEKLY_EVENTS,
  getCurrentEvent,
  getNextEvent,
} from '../data/churchData';
import { BIBLE_BOOKS } from '../data/bible/books';
import { verseOfDay } from '../data/dailyVerses';
import { RADIO_STATIONS, RadioStation } from '../data/radioStations';
import { fetchCultos, inProgress, loadHistory, HistoryEntry, Video } from '../services/youtubeService';
import { whatsappChurch } from '../services/contactService';
import { GIVING_ENABLED } from './GiveScreen';
import { activeAnnouncements, useChurchContent } from '../context/ContentContext';
import { useAuth } from '../context/AuthContext';

const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Mesmas chaves gravadas pelas abas Bíblia e Rádio.
const BIBLE_LAST_KEY = 'bible:last';
const RADIO_LAST_KEY = 'radio:last';

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function describeWhen(date: Date, now: Date): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86400000);
  if (days === 0) return `Hoje, às ${time}`;
  if (days === 1) return `Amanhã, às ${time}`;
  return `${DAYS_FULL[date.getDay()]}, às ${time}`;
}

/** "faltam 2 d 4 h", "faltam 3 h 10 min", "faltam 25 min". */
function timeLeft(target: Date, now: Date): string {
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `faltam ${d} d ${h} h`;
  if (h > 0) return `faltam ${h} h ${m} min`;
  return `faltam ${m} min`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

interface ContinueState {
  bible: { slug: string; chapter: number; name: string } | null;
  video: HistoryEntry | null;
  radio: RadioStation | null;
}

export default function HomeScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [now, setNow] = useState(() => new Date());
  const [latest, setLatest] = useState<Video | null>(null);
  const [cont, setCont] = useState<ContinueState>({ bible: null, video: null, radio: null });

  // Avisos e eventos editáveis (content/igreja.json); também faz a tela
  // redesenhar quando um evento especial online muda o "próximo culto".
  const content = useChurchContent();
  const firstName = useAuth().displayName.trim().split(/\s+/)[0] ?? '';
  const announcements = activeAnnouncements(content.announcements, now);

  const live = getCurrentEvent(now);
  const next = getNextEvent(now);
  const verse = verseOfDay(now);

  useEffect(() => {
    // Mesma busca (e cache) da aba Pregações. Sem chave ou sem rede, o card
    // simplesmente não aparece.
    fetchCultos()
      .then((page) => setLatest(page.videos[0] ?? null))
      .catch(() => {});
  }, []);

  // A Início fica montada enquanto a pessoa usa as outras abas: o "continue de
  // onde parou" e o relógio se atualizam sempre que ela volta para cá.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      Promise.all([
        AsyncStorage.getItem(BIBLE_LAST_KEY).catch(() => null),
        loadHistory(),
        AsyncStorage.getItem(RADIO_LAST_KEY).catch(() => null),
      ]).then(([bibleRaw, history, radioId]) => {
        let bible: ContinueState['bible'] = null;
        try {
          const pos = bibleRaw ? JSON.parse(bibleRaw) : null;
          const book = pos && BIBLE_BOOKS.find((b) => b.slug === pos.slug);
          if (book) bible = { slug: book.slug, chapter: pos.chapter, name: book.name };
        } catch {
          bible = null;
        }
        setCont({
          bible,
          video: inProgress(history)[0] ?? null,
          radio: RADIO_STATIONS.find((s) => s.id === radioId) ?? null,
        });
      });
    }, [])
  );

  const shareVerse = () => {
    Share.share({
      message: `“${verse.text}”\n— ${verse.reference}\n\n${CHURCH_INFO.name} · Reino de Sacerdotes`,
    }).catch(() => {});
  };

  const hasContinue = cont.bible || cont.video || cont.radio;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Topo: saudação, logo e horários como no banner do canal. */}
      <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => navigation.navigate('Meu perfil')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Meu perfil"
          >
            <Avatar size={48} />
            <View style={styles.userText}>
              <Text style={styles.greeting} numberOfLines={1}>
                {greeting(now)}
                {firstName ? `, ${firstName}` : ''} 👋
              </Text>
              <Text style={styles.today}>
                {WEEKDAYS[now.getDay()]}, {now.getDate()} de {MONTHS[now.getMonth()]}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gear}
            onPress={() => navigation.navigate('Configurações')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoBox}>
          <ChurchLogo size="large" align="center" />
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
      </View>

      {/* Sobrepõe a borda do topo, para dar profundidade. */}
      {live ? (
        <TouchableOpacity
          style={[styles.nextCard, styles.liveCard]}
          activeOpacity={0.85}
          onPress={() => Linking.openURL(`${CHURCH_INFO.youtube}/live`)}
        >
          <View style={styles.nextIcon}>
            <Ionicons name="radio-outline" size={24} color="#fff" />
          </View>
          <View style={styles.nextInfo}>
            <Text style={styles.nextLabel}>ACONTECENDO AGORA</Text>
            <Text style={styles.nextTitle}>{live.title}</Text>
            <Text style={styles.nextMeta}>Toque para assistir ao vivo</Text>
          </View>
          <Ionicons name="logo-youtube" size={26} color="#fff" />
        </TouchableOpacity>
      ) : (
        next && (
          <TouchableOpacity
            style={styles.nextCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Calendário')}
          >
            <View style={styles.nextIcon}>
              <Ionicons name="time-outline" size={24} color="#fff" />
            </View>
            <View style={styles.nextInfo}>
              <Text style={styles.nextLabel}>{next.special ? 'PRÓXIMO EVENTO' : 'PRÓXIMO CULTO'}</Text>
              <Text style={styles.nextTitle}>{describeWhen(next.date, now)}</Text>
              <Text style={styles.nextMeta}>
                {next.event.title} · {timeLeft(next.date, now)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#ffffffCC" />
          </TouchableOpacity>
        )
      )}

      {announcements.length > 0 && (
        <>
          <SectionTitle styles={styles} title="Avisos" />
          {announcements.map((a) => (
            <View key={a.id} style={styles.notice}>
              <View style={styles.noticeIcon}>
                <Ionicons name="megaphone" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>{a.title}</Text>
                {a.text ? <Text style={styles.noticeText}>{a.text}</Text> : null}
                {a.link && (
                  <TouchableOpacity onPress={() => Linking.openURL(a.link!)} hitSlop={8}>
                    <Text style={styles.noticeLink}>Saiba mais ›</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {hasContinue && (
        <>
          <SectionTitle styles={styles} title="Continue de onde parou" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {cont.video && (
              <TouchableOpacity
                style={styles.contCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('Pregações', {
                    playVideo: cont.video!.video,
                    start: cont.video!.seconds,
                  })
                }
              >
                <View style={styles.contThumb}>
                  {cont.video.video.thumbnail ? (
                    <Image source={{ uri: cont.video.video.thumbnail }} style={styles.fill} />
                  ) : null}
                  <View style={styles.contPlay}>
                    <Ionicons name="play" size={18} color="#fff" />
                  </View>
                  {cont.video.video.durationSeconds > 0 && (
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(100, (cont.video.seconds / cont.video.video.durationSeconds) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.contKind}>▶ ASSISTINDO</Text>
                <Text style={styles.contTitle} numberOfLines={2}>
                  {cont.video.video.title}
                </Text>
                <Text style={styles.contMeta}>Parou em {formatClock(cont.video.seconds)}</Text>
              </TouchableOpacity>
            )}

            {cont.bible && (
              <TouchableOpacity
                style={styles.contCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('Bíblia', {
                    open: { slug: cont.bible!.slug, chapter: cont.bible!.chapter },
                  })
                }
              >
                <View style={[styles.contThumb, styles.contBible]}>
                  <Ionicons name="book" size={26} color="#ffffffCC" />
                  <Text style={styles.contBibleText}>
                    {cont.bible.name} {cont.bible.chapter}
                  </Text>
                </View>
                <Text style={styles.contKind}>📖 LENDO</Text>
                <Text style={styles.contTitle} numberOfLines={2}>
                  {cont.bible.name}, capítulo {cont.bible.chapter}
                </Text>
                <Text style={styles.contMeta}>Continuar a leitura</Text>
              </TouchableOpacity>
            )}

            {cont.radio && (
              <TouchableOpacity
                style={styles.contCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Rádio', { playStationId: cont.radio!.id })}
              >
                <View style={[styles.contThumb, styles.contRadio]}>
                  <View style={styles.contRadioDisc}>
                    <Ionicons name="play" size={22} color={colors.primary} />
                  </View>
                </View>
                <Text style={styles.contKind}>📻 OUVINDO</Text>
                <Text style={styles.contTitle} numberOfLines={2}>
                  {cont.radio.name}
                </Text>
                <Text style={styles.contMeta} numberOfLines={1}>
                  {cont.radio.description}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </>
      )}

      <SectionTitle styles={styles} title="Participe" />
      <View style={styles.participate}>
        <TouchableOpacity
          style={styles.participateCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Pedido de oração')}
        >
          <View style={styles.participateIcon}>
            <Ionicons name="heart" size={22} color={colors.white} />
          </View>
          <Text style={styles.participateTitle}>Pedido de oração</Text>
          <Text style={styles.participateText}>Vamos orar por você</Text>
        </TouchableOpacity>
        {GIVING_ENABLED && (
          <TouchableOpacity
            style={styles.participateCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Dízimos e ofertas')}
          >
            <View style={[styles.participateIcon, { backgroundColor: colors.gold }]}>
              <Ionicons name="gift" size={22} color={colors.white} />
            </View>
            <Text style={styles.participateTitle}>Dízimos e ofertas</Text>
            <Text style={styles.participateText}>Contribua via Pix</Text>
          </TouchableOpacity>
        )}
      </View>

      <SectionTitle styles={styles} title="Versículo do dia" />
      <View style={styles.verseCard}>
        <Ionicons name="sparkles" size={20} color={colors.gold} style={styles.verseIcon} />
        <Text style={styles.verseText}>“{verse.text}”</Text>
        <View style={styles.verseFooter}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Bíblia', { open: { slug: verse.slug, chapter: verse.chapter } })
            }
            hitSlop={8}
            accessibilityLabel={`Ler ${verse.reference} no capítulo`}
          >
            <Text style={styles.verseRef}>{verse.reference} ›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.verseShare} onPress={shareVerse} hitSlop={8}>
            <Ionicons name="share-social-outline" size={18} color={colors.primary} />
            <Text style={styles.verseShareText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {latest && (
        <>
          <SectionTitle
            styles={styles}
            title="Última ministração"
            action="Ver todas"
            onAction={() => navigation.navigate('Pregações')}
          />
          <TouchableOpacity
            style={styles.latest}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Pregações', { playVideo: latest, start: 0 })}
          >
            {latest.thumbnail && <Image source={{ uri: latest.thumbnail }} style={styles.fill} />}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.latestShade} />
            <View style={styles.latestPlay}>
              <Ionicons name="play" size={26} color="#fff" />
            </View>
            <View style={styles.latestInfo}>
              <Text style={styles.latestTitle} numberOfLines={2}>
                {latest.title}
              </Text>
              <Text style={styles.latestDate}>{formatDate(latest.publishedAt)}</Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      <SectionTitle styles={styles} title="Visite-nos" />
      <View style={styles.padded}>
        <ChurchContactCard />
      </View>

      <View style={styles.social}>
        {[
          { icon: 'logo-instagram' as const, onPress: () => Linking.openURL(CHURCH_INFO.instagram), label: 'Instagram' },
          { icon: 'logo-youtube' as const, onPress: () => Linking.openURL(CHURCH_INFO.youtube), label: 'YouTube' },
          { icon: 'logo-whatsapp' as const, onPress: whatsappChurch, label: 'WhatsApp' },
        ].map((s) => (
          <TouchableOpacity
            key={s.label}
            style={styles.socialButton}
            onPress={s.onPress}
            accessibilityLabel={s.label}
          >
            <Ionicons name={s.icon} size={22} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.footer}>Casa de Adoração · Reino de Sacerdotes · Trindade-GO</Text>
    </ScrollView>
  );
}

function SectionTitle({
  styles,
  title,
  action,
  onAction,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action} ›</Text>
        </TouchableOpacity>
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
    fill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
    },
    padded: {
      paddingHorizontal: SIZES.padding,
    },
    hero: {
      backgroundColor: c.surface,
      paddingHorizontal: SIZES.padding,
      paddingBottom: 52,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    userRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },
    userText: {
      flex: 1,
      marginLeft: 12,
    },
    greeting: {
      ...FONTS.bold,
      fontSize: SIZES.xl,
      color: c.text,
    },
    today: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    gear: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoBox: {
      alignItems: 'center',
      marginTop: 22,
    },
    schedule: {
      flexDirection: 'row',
      marginTop: 18,
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
    nextCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.primary,
      marginHorizontal: SIZES.padding,
      marginTop: -32,
      borderRadius: SIZES.radius + 4,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    liveCard: {
      backgroundColor: '#C62828',
    },
    nextIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.16)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    nextInfo: {
      flex: 1,
      marginHorizontal: 12,
    },
    nextLabel: {
      ...FONTS.mono,
      fontSize: 11,
      color: '#ffffffCC',
      letterSpacing: 1,
    },
    nextTitle: {
      ...FONTS.bold,
      fontSize: SIZES.large,
      color: '#fff',
      marginTop: 1,
    },
    nextMeta: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: '#ffffffDD',
      marginTop: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: SIZES.padding,
      marginTop: 26,
      marginBottom: 10,
    },
    sectionBar: {
      width: 3,
      height: 18,
      backgroundColor: c.primary,
      marginRight: 8,
    },
    sectionTitle: {
      ...FONTS.bold,
      fontSize: SIZES.large,
      color: c.text,
      flex: 1,
    },
    sectionAction: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
    },
    carousel: {
      paddingHorizontal: SIZES.padding,
      gap: 12,
    },
    contCard: {
      width: 170,
    },
    contThumb: {
      height: 96,
      borderRadius: SIZES.radius,
      overflow: 'hidden',
      backgroundColor: c.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contPlay: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 2,
    },
    progressTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#E53935',
    },
    contBible: {
      backgroundColor: c.primary,
      gap: 4,
    },
    contBibleText: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: '#fff',
    },
    contRadio: {
      backgroundColor: c.gold,
    },
    contRadioDisc: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 3,
    },
    contKind: {
      ...FONTS.mono,
      fontSize: 10,
      color: c.textLight,
      marginTop: 8,
      letterSpacing: 0.5,
    },
    contTitle: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
      marginTop: 2,
    },
    contMeta: {
      ...FONTS.regular,
      fontSize: 11,
      color: c.textLight,
      marginTop: 2,
    },
    notice: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: c.card,
      marginHorizontal: SIZES.padding,
      marginBottom: 10,
      borderRadius: SIZES.radius + 4,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 4,
      borderLeftColor: c.primary,
    },
    noticeIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
    },
    noticeTitle: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.text,
    },
    noticeText: {
      ...FONTS.regular,
      fontSize: SIZES.font,
      color: c.textLight,
      marginTop: 3,
      lineHeight: 20,
    },
    noticeLink: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
      marginTop: 8,
    },
    participate: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: SIZES.padding,
    },
    participateCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: SIZES.radius + 4,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    participateIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    participateTitle: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.text,
      marginTop: 10,
    },
    participateText: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    verseCard: {
      backgroundColor: c.card,
      marginHorizontal: SIZES.padding,
      borderRadius: SIZES.radius + 4,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
    },
    verseIcon: {
      marginBottom: 8,
    },
    verseText: {
      ...FONTS.regular,
      fontSize: SIZES.large,
      lineHeight: 27,
      color: c.text,
      fontStyle: 'italic',
    },
    verseFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    verseRef: {
      ...FONTS.mono,
      fontSize: SIZES.font,
      color: c.primary,
    },
    verseShare: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    verseShareText: {
      ...FONTS.medium,
      fontSize: SIZES.small,
      color: c.primary,
    },
    latest: {
      marginHorizontal: SIZES.padding,
      aspectRatio: 16 / 9,
      borderRadius: SIZES.radius + 4,
      overflow: 'hidden',
      backgroundColor: c.primaryDark,
      justifyContent: 'flex-end',
    },
    latestShade: {
      position: 'absolute',
      top: '30%',
      left: 0,
      right: 0,
      bottom: 0,
    },
    latestPlay: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 3,
    },
    latestInfo: {
      padding: 14,
    },
    latestTitle: {
      ...FONTS.bold,
      fontSize: SIZES.large,
      color: '#fff',
    },
    latestDate: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: '#ffffffCC',
      marginTop: 4,
    },
    social: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 28,
    },
    socialButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 14,
    },
  });

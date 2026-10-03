import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Linking,
  RefreshControl,
} from 'react-native';
import { PLAYER_STATES, YoutubeIframeRef } from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import { SIZES, FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';
import SectionHeader from '../components/SectionHeader';
import VideoRow, { ThumbOverlay, watchedFraction } from '../components/sermons/VideoRow';
import VideoPlayerModal from '../components/sermons/VideoPlayerModal';
import { MONTHS, foldText, formatClock, formatDuration, formatShortDate } from '../utils/format';
import { CHURCH_INFO, getCurrentEvent } from '../data/churchData';
import {
  Serie,
  Video,
  WatchHistory,
  fetchSeries,
  fetchSerieVideos,
  fetchCultos,
  loadHistory,
  recordWatch,
  removeFromHistory,
  inProgress,
  isFinished,
  resumePoint,
} from '../services/youtubeService';
import { emitAppEvent, onAppEvent } from '../services/appEvents';
import { useNow } from '../hooks/useNow';


type Tab = 'destaques' | 'series' | 'cultos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'series', label: 'Séries' },
  { id: 'cultos', label: 'Cultos' },
];

interface PlayerState {
  list: Video[];
  index: number;
  start: number;
}

export default function SermonsScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('destaques');

  const [series, setSeries] = useState<Serie[] | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [openSerie, setOpenSerie] = useState<Serie | null>(null);
  const [serieVideos, setSerieVideos] = useState<Video[] | null>(null);
  const [serieError, setSerieError] = useState<string | null>(null);

  const [cultos, setCultos] = useState<Video[] | null>(null);
  const [cultosToken, setCultosToken] = useState<string | undefined>();
  const [cultosError, setCultosError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');

  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [history, setHistory] = useState<WatchHistory>({});
  const playerRef = useRef<YoutubeIframeRef | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // A aba fica montada: sem o relógio andando, o aviso de culto ao vivo não
  // apareceria para quem a abriu antes do culto começar.
  const liveEvent = getCurrentEvent(useNow());

  // Vindo da Início ("continue de onde parou" ou última ministração): abre o
  // player direto. Sem start explícito, retoma pelo histórico.
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const params = route.params as { playVideo?: Video; start?: number } | undefined;
  useEffect(() => {
    const video = params?.playVideo;
    if (!video) return;
    closeSerie();
    loadHistory().then((h) => {
      const start = params?.start || resumePoint(h, video);
      setPlayer({ list: [video], index: 0, start });
    });
    navigation.setParams({ playVideo: undefined, start: undefined });
  }, [params?.playVideo]);

  const loadSeries = useCallback(() => {
    setSeriesError(null);
    fetchSeries()
      .then(setSeries)
      .catch((e: Error) => setSeriesError(e.message));
  }, []);

  const loadCultos = useCallback(() => {
    setCultosError(null);
    fetchCultos()
      .then((page) => {
        setCultos(page.videos);
        setCultosToken(page.nextPageToken);
      })
      .catch((e: Error) => setCultosError(e.message));
  }, []);

  // Destaques precisa das duas listas. Ambas têm cache no aparelho (e a de
  // cultos é a mesma da página inicial), então abrir a aba quase não gasta cota.
  useEffect(() => {
    loadSeries();
    loadCultos();
    loadHistory().then(setHistory);
  }, [loadSeries, loadCultos]);

  // "Limpar dados salvos" (Configurações) apagou o histórico do aparelho.
  useEffect(() => onAppEvent('personal-data-cleared', () => setHistory({})), []);

  // Puxar a tela para baixo: busca de novo, sem esperar o cache vencer (culto
  // que acabou de subir no canal aparece na hora).
  const refreshAll = () => {
    setRefreshing(true);
    Promise.allSettled([
      fetchSeries({ force: true }).then((s) => {
        setSeries(s);
        setSeriesError(null);
      }),
      fetchCultos(undefined, { force: true }).then((page) => {
        setCultos(page.videos);
        setCultosToken(page.nextPageToken);
        setCultosError(null);
      }),
    ]).finally(() => setRefreshing(false));
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refreshAll}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  // Qual série está aberta agora, para descartar a resposta atrasada de uma
  // série que a pessoa já fechou.
  const openSerieId = useRef<string | null>(null);

  const openSerieView = (serie: Serie) => {
    openSerieId.current = serie.id;
    setOpenSerie(serie);
    setSerieVideos(null);
    setSerieError(null);
    fetchSerieVideos(serie.id)
      .then((videos) => {
        if (openSerieId.current === serie.id) setSerieVideos(videos);
      })
      .catch((e: Error) => {
        if (openSerieId.current === serie.id) setSerieError(e.message);
      });
  };

  const closeSerie = () => {
    openSerieId.current = null;
    setOpenSerie(null);
  };

  const loadMoreCultos = () => {
    if (!cultosToken || loadingMore) return;
    setLoadingMore(true);
    fetchCultos(cultosToken)
      .then((page) => {
        // O cursor do YouTube é por posição: se o canal publicou desde a
        // primeira página, a lista desloca e um vídeo pode vir repetido.
        setCultos((prev) => {
          const seen = new Set((prev ?? []).map((v) => v.id));
          return [...(prev ?? []), ...page.videos.filter((v) => !seen.has(v.id))];
        });
        setCultosToken(page.nextPageToken);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  /** Toca a partir de onde a pessoa parou, se ela não terminou o vídeo. */
  const play = (list: Video[], index: number) => {
    setPlayer({ list, index, start: resumePoint(history, list[index]) });
  };

  // Vídeo começou: a rádio (outra aba, que segue tocando em segundo plano)
  // para, senão os dois áudios tocam juntos.
  const currentId = player ? player.list[player.index].id : null;
  useEffect(() => {
    if (currentId) emitAppEvent('video-start');
  }, [currentId]);

  // getCurrentTime conversa com o WebView; se ele não responder, não pode
  // travar o botão de fechar.
  const readCurrentTime = (): Promise<number | null> =>
    Promise.race([
      playerRef.current ? playerRef.current.getCurrentTime() : Promise.resolve(null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ]).catch(() => null);

  /** Guarda até onde a pessoa assistiu (menos de 30 s não conta como começado). */
  const saveProgress = (video: Video, seconds: number | null) => {
    if (seconds === null || seconds < 30) return;
    setHistory((h) => recordWatch(h, video, seconds, isFinished(video, seconds)));
  };

  const closePlayer = async () => {
    const current = player ? player.list[player.index] : null;
    const seconds = await readCurrentTime();
    setPlayer(null);
    if (current) saveProgress(current, seconds);
  };

  /** Próximo da lista, retomando de onde a pessoa parou nele. */
  const advance = (from: PlayerState, h: WatchHistory) => {
    const index = from.index + 1;
    if (index >= from.list.length) return;
    setPlayer({ ...from, index, start: resumePoint(h, from.list[index]) });
  };

  // "A seguir": antes de trocar, guarda o ponto do vídeo atual. Sem isso,
  // quem viu 40 min de um culto e pulou para o próximo perdia o "continuar".
  const playNext = async () => {
    if (!player) return;
    const from = player;
    const seconds = await readCurrentTime();
    saveProgress(from.list[from.index], seconds);
    advance(from, history);
  };

  const onPlayerState = (state: PLAYER_STATES) => {
    if (state !== PLAYER_STATES.ENDED || !player) return;
    const current = player.list[player.index];
    const next = recordWatch(history, current, current.durationSeconds, true);
    setHistory(next);
    advance(player, next);
  };

  const current = player ? player.list[player.index] : null;
  const upNext = player && player.index < player.list.length - 1 ? player.list[player.index + 1] : null;
  const continueList = useMemo(() => inProgress(history).slice(0, 10), [history]);

  // Cultos agrupados por mês, filtrados pela busca.
  const cultoSections = useMemo(() => {
    // Sem acento dos dois lados: "pregacao" acha "Pregação".
    const q = foldText(search);
    const list = (cultos ?? []).filter((v) => !q || foldText(v.title).includes(q));
    const sections: { title: string; data: Video[] }[] = [];
    for (const v of list) {
      const d = new Date(v.publishedAt);
      const title = `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
      const last = sections[sections.length - 1];
      if (last && last.title === title) last.data.push(v);
      else sections.push({ title, data: [v] });
    }
    return sections;
  }, [cultos, search]);

  const renderState = (error: string | null, retry: () => void) =>
    error ? (
      <View style={styles.centerBox}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.gray} />
        <Text style={styles.centerText}>Não foi possível carregar as pregações.</Text>
        <Text style={styles.centerDetail}>Verifique sua conexão e tente novamente.</Text>
        {/* O erro técnico vem do Google, em inglês: só interessa a quem desenvolve. */}
        {__DEV__ && <Text style={styles.centerDetail}>{error}</Text>}
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );

  const renderSerieCard = (item: Serie, style?: object) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.serieCard, style]}
      onPress={() => openSerieView(item)}
      activeOpacity={0.85}
    >
      <View style={styles.serieThumbBox}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.fill} />
        ) : (
          <Ionicons name="albums-outline" size={32} color={colors.white} />
        )}
        <View style={styles.countBadge}>
          <Ionicons name="albums" size={11} color="#fff" />
          <Text style={styles.badgeText}>{item.videoCount}</Text>
        </View>
      </View>
      <Text style={styles.serieTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderDestaques = () => {
    if (!cultos && !series) return renderState(cultosError ?? seriesError, () => {
      loadCultos();
      loadSeries();
    });
    const hero = cultos?.[0];
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {liveEvent && (
          <TouchableOpacity
            style={styles.liveBanner}
            onPress={() => Linking.openURL(CHURCH_INFO.youtubeLive)}
            activeOpacity={0.85}
          >
            <View style={styles.liveDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.liveLabel}>CULTO ACONTECENDO AGORA</Text>
              <Text style={styles.liveTitle}>{liveEvent.title} · assistir ao vivo</Text>
            </View>
            <Ionicons name="logo-youtube" size={26} color="#fff" />
          </TouchableOpacity>
        )}

        {hero && (
          <TouchableOpacity
            style={styles.hero}
            onPress={() => play(cultos!, 0)}
            activeOpacity={0.9}
          >
            {hero.thumbnail ? <Image source={{ uri: hero.thumbnail }} style={styles.fill} /> : null}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.heroShade}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>ÚLTIMO CULTO</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {hero.title}
              </Text>
              <View style={styles.heroRow}>
                <View style={styles.heroPlay}>
                  <Ionicons name="play" size={16} color={colors.primary} />
                  <Text style={styles.heroPlayText}>
                    {history[hero.id] && !history[hero.id].finished ? 'Continuar' : 'Assistir'}
                  </Text>
                </View>
                <Text style={styles.heroMeta}>
                  {formatShortDate(hero.publishedAt)} · {formatDuration(hero.durationSeconds)}
                </Text>
              </View>
            </View>
            {watchedFraction(history, hero) !== null && !history[hero.id]?.finished && (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(watchedFraction(history, hero) ?? 0) * 100}%` },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        {continueList.length > 0 && (
          <>
            <SectionHeader title="Continuar assistindo" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {continueList.map((entry) => (
                <View key={entry.video.id} style={styles.continueCard}>
                  <TouchableOpacity
                    onPress={() => play([entry.video], 0)}
                    activeOpacity={0.85}
                    accessibilityLabel={`Continuar ${entry.video.title} a partir de ${formatClock(entry.seconds)}`}
                  >
                    <View style={styles.continueThumb}>
                      {entry.video.thumbnail ? (
                        <Image source={{ uri: entry.video.thumbnail }} style={styles.fill} />
                      ) : null}
                      <View style={styles.continuePlay}>
                        <Ionicons name="play" size={20} color="#fff" />
                      </View>
                      <ThumbOverlay video={entry.video} history={history} />
                    </View>
                    <Text style={styles.continueTitle} numberOfLines={2}>
                      {entry.video.title}
                    </Text>
                    <Text style={styles.continueMeta}>Parou em {formatClock(entry.seconds)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.continueRemove}
                    onPress={() => setHistory((h) => removeFromHistory(h, entry.video.id))}
                    hitSlop={8}
                    accessibilityLabel="Remover de continuar assistindo"
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {series && series.length > 0 && (
          <>
            <SectionHeader title="Séries" action="Ver todas" onAction={() => setTab('series')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {series.slice(0, 10).map((s) => renderSerieCard(s, styles.serieCarouselCard))}
            </ScrollView>
          </>
        )}

        {cultos && cultos.length > 1 && (
          <>
            <SectionHeader title="Cultos recentes" action="Ver todos" onAction={() => setTab('cultos')} />
            <View style={styles.padded}>
              {cultos.slice(1, 6).map((v, i) => (
                <VideoRow key={v.id} video={v} history={history} onPress={() => play(cultos, i + 1)} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  const renderSerieDetail = (serie: Serie) => {
    // Primeiro episódio não terminado, para o botão "continuar".
    const nextIndex = serieVideos ? serieVideos.findIndex((v) => !history[v.id]?.finished) : -1;
    const started = serieVideos?.some((v) => history[v.id]);
    const watchedCount = serieVideos?.filter((v) => history[v.id]?.finished).length ?? 0;
    return (
      <FlatList
        data={serieVideos ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.serieListContent}
        ListHeaderComponent={
          <>
            <View style={styles.serieHero}>
              {serie.thumbnail ? <Image source={{ uri: serie.thumbnail }} style={styles.fill} /> : null}
              <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)']} style={styles.fill} />
              <TouchableOpacity
                onPress={closeSerie}
                style={styles.serieBack}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
                <Text style={styles.serieBackText}>Pregações</Text>
              </TouchableOpacity>
              <View style={styles.serieHeroContent}>
                <Text style={styles.heroLabel}>SÉRIE</Text>
                <Text style={styles.serieHeroTitle} numberOfLines={2}>
                  {serie.title}
                </Text>
                <Text style={styles.heroMeta}>
                  {serieVideos ? serieVideos.length : serie.videoCount} ministrações
                  {watchedCount > 0 ? ` · ${watchedCount} assistidas` : ''}
                </Text>
              </View>
            </View>
            {serieVideos && serieVideos.length > 0 && (
              <TouchableOpacity
                style={styles.serieCta}
                onPress={() => play(serieVideos, Math.max(0, nextIndex))}
              >
                <Ionicons name="play" size={18} color={colors.white} />
                <Text style={styles.serieCtaText}>
                  {started && nextIndex > 0
                    ? `Continuar · episódio ${nextIndex + 1}`
                    : 'Assistir do início'}
                </Text>
              </TouchableOpacity>
            )}
            {!serieVideos && renderState(serieError, () => openSerieView(serie))}
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.padded}>
            <VideoRow
              video={item}
              history={history}
              prefix={`${index + 1}. `}
              onPress={() => play(serieVideos ?? [], index)}
            />
          </View>
        )}
        ListEmptyComponent={
          serieVideos ? (
            <Text style={styles.emptyText}>Esta série ainda não tem vídeos disponíveis.</Text>
          ) : null
        }
      />
    );
  };

  const renderCultos = () =>
    cultos ? (
      <SectionList
        sections={cultoSections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        ListHeaderComponent={
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar pelo título"
              placeholderTextColor={colors.gray}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.gray} />
              </TouchableOpacity>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.monthHeader}>{section.title.toUpperCase()}</Text>
        )}
        renderItem={({ item }) => (
          <VideoRow
            video={item}
            history={history}
            onPress={() => play(cultos, cultos.indexOf(item))}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {search ? 'Nenhum culto com esse título entre os carregados.' : 'Nenhum culto encontrado.'}
          </Text>
        }
        ListFooterComponent={
          cultosToken ? (
            <TouchableOpacity style={styles.loadMore} onPress={loadMoreCultos} disabled={loadingMore}>
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Carregar cultos anteriores</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />
    ) : (
      renderState(cultosError, loadCultos)
    );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Pregações" subtitle="Casa de Adoração Official · YouTube" />

      {openSerie ? (
        renderSerieDetail(openSerie)
      ) : (
        <>
          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, tab === t.id && styles.tabActive]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'destaques' && renderDestaques()}

          {tab === 'series' &&
            (series ? (
              <FlatList
                data={series}
                renderItem={({ item }) => renderSerieCard(item)}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.serieColumns}
                contentContainerStyle={styles.listContent}
                refreshControl={refreshControl}
              />
            ) : (
              renderState(seriesError, loadSeries)
            ))}

          {tab === 'cultos' && renderCultos()}
        </>
      )}

      <VideoPlayerModal
        video={current}
        start={player?.start ?? 0}
        upNext={upNext}
        playerRef={playerRef}
        onClose={closePlayer}
        onChangeState={onPlayerState}
        onPlayNext={playNext}
      />
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
    tabs: {
      flexDirection: 'row',
      marginHorizontal: SIZES.padding,
      marginTop: 12,
      marginBottom: 4,
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: SIZES.radius - 4,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: c.primary,
    },
    tabText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.textLight,
    },
    tabTextActive: {
      color: c.white,
    },
    scrollContent: {
      paddingTop: 8,
      paddingBottom: 32,
    },
    liveBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#C62828',
      marginHorizontal: SIZES.padding,
      marginTop: 8,
      padding: 14,
      borderRadius: SIZES.radius,
    },
    liveDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#fff',
    },
    liveLabel: {
      ...FONTS.mono,
      fontSize: 11,
      color: '#ffffffCC',
    },
    liveTitle: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: '#fff',
      marginTop: 1,
    },
    hero: {
      marginHorizontal: SIZES.padding,
      marginTop: 12,
      aspectRatio: 16 / 10,
      borderRadius: SIZES.radius + 4,
      overflow: 'hidden',
      backgroundColor: c.primaryDark,
      justifyContent: 'flex-end',
    },
    heroShade: {
      position: 'absolute',
      top: '35%',
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroContent: {
      padding: SIZES.padding,
    },
    heroLabel: {
      ...FONTS.mono,
      fontSize: 11,
      color: '#ffffffCC',
      letterSpacing: 1,
    },
    heroTitle: {
      ...FONTS.bold,
      fontSize: SIZES.xl,
      color: '#fff',
      marginTop: 4,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 10,
    },
    heroPlay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#fff',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    heroPlayText: {
      ...FONTS.bold,
      fontSize: SIZES.font,
      color: c.primary,
    },
    heroMeta: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: '#ffffffCC',
      marginTop: 2,
    },
    carousel: {
      paddingHorizontal: SIZES.padding,
      gap: 12,
    },
    continueCard: {
      width: 220,
    },
    continueThumb: {
      aspectRatio: 16 / 9,
      borderRadius: SIZES.radius,
      overflow: 'hidden',
      backgroundColor: c.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    continuePlay: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 3,
    },
    continueRemove: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    continueTitle: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
      marginTop: 6,
    },
    continueMeta: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      marginTop: 2,
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
    countBadge: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      ...FONTS.medium,
      color: '#fff',
      fontSize: 11,
    },
    listContent: {
      paddingHorizontal: SIZES.padding,
      paddingTop: 8,
      paddingBottom: 24,
    },
    serieColumns: {
      gap: 12,
    },
    serieCard: {
      flex: 1,
      marginBottom: 16,
    },
    serieCarouselCard: {
      flex: 0,
      width: 180,
      marginBottom: 0,
    },
    serieThumbBox: {
      aspectRatio: 16 / 9,
      borderRadius: SIZES.radius,
      backgroundColor: c.primaryLight,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    serieTitle: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
      marginTop: 6,
    },
    serieListContent: {
      paddingBottom: 24,
    },
    serieHero: {
      aspectRatio: 16 / 10,
      backgroundColor: c.primaryDark,
      justifyContent: 'flex-end',
    },
    serieBack: {
      position: 'absolute',
      top: 10,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingVertical: 5,
      paddingLeft: 4,
      paddingRight: 10,
      borderRadius: 16,
    },
    serieBackText: {
      ...FONTS.medium,
      color: '#fff',
      fontSize: SIZES.font,
    },
    serieHeroContent: {
      padding: SIZES.padding,
    },
    serieHeroTitle: {
      ...FONTS.bold,
      fontSize: SIZES.extraLarge,
      color: '#fff',
      marginTop: 4,
    },
    serieCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      margin: SIZES.padding,
      paddingVertical: 13,
      borderRadius: SIZES.radius,
    },
    serieCtaText: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.white,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 4,
    },
    searchInput: {
      ...FONTS.regular,
      flex: 1,
      marginLeft: 8,
      fontSize: SIZES.font,
      color: c.text,
    },
    monthHeader: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      letterSpacing: 1,
      marginTop: 14,
      marginBottom: 8,
    },
    loadMore: {
      alignItems: 'center',
      paddingVertical: 14,
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 6,
    },
    loadMoreText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
    },
    emptyText: {
      ...FONTS.regular,
      textAlign: 'center',
      color: c.textLight,
      fontSize: SIZES.font,
      marginTop: 32,
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    centerText: {
      ...FONTS.medium,
      fontSize: SIZES.medium,
      color: c.text,
      marginTop: 12,
      textAlign: 'center',
    },
    centerDetail: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 6,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 16,
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: SIZES.radius,
    },
    retryText: {
      ...FONTS.medium,
      color: c.white,
    },
  });

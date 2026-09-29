import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import YoutubePlayer, { PLAYER_STATES, YoutubeIframeRef } from 'react-native-youtube-iframe';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIZES, FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';
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
} from '../services/youtubeService';

const { width } = Dimensions.get('window');
const PLAYER_HEIGHT = Math.round((width * 9) / 16);
const LIVE_URL = `${CHURCH_INFO.youtube}/live`;

type Tab = 'destaques' | 'series' | 'cultos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'series', label: 'Séries' },
  { id: 'cultos', label: 'Cultos' },
];

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

interface PlayerState {
  list: Video[];
  index: number;
  start: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${pad(m)}min` : `${m} min`;
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Fração assistida (0–1), ou null se o vídeo nunca foi aberto. */
function watchedFraction(history: WatchHistory, video: Video): number | null {
  const entry = history[video.id];
  if (!entry) return null;
  if (entry.finished) return 1;
  return video.durationSeconds > 0 ? Math.min(1, entry.seconds / video.durationSeconds) : null;
}

type Styles = ReturnType<typeof makeStyles>;

/** Duração no canto e barra de progresso embaixo, sobre a miniatura. */
function ThumbOverlay({ video, history, styles }: { video: Video; history: WatchHistory; styles: Styles }) {
  const fraction = watchedFraction(history, video);
  const finished = history[video.id]?.finished;
  return (
    <>
      {finished ? (
        <View style={styles.watchedBadge}>
          <Ionicons name="checkmark" size={12} color="#fff" />
          <Text style={styles.badgeText}>Assistido</Text>
        </View>
      ) : video.durationSeconds > 0 ? (
        <View style={styles.durationBadge}>
          <Text style={styles.badgeText}>{formatDuration(video.durationSeconds)}</Text>
        </View>
      ) : null}
      {fraction !== null && !finished && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(4, fraction * 100)}%` }]} />
        </View>
      )}
    </>
  );
}

interface VideoRowProps {
  video: Video;
  history: WatchHistory;
  prefix?: string;
  onPress: () => void;
}

function VideoRow({ video, history, prefix = '', onPress }: VideoRowProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.videoRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.videoThumbBox}>
        {video.thumbnail ? <Image source={{ uri: video.thumbnail }} style={styles.fill} /> : null}
        <ThumbOverlay video={video} history={history} styles={styles} />
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={3}>
          {prefix}
          {video.title}
        </Text>
        <Text style={styles.videoMeta}>{formatDate(video.publishedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { styles } = useThemedStyles(makeStyles);
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

  const [liveEvent] = useState(() => getCurrentEvent());

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
    const entry = history[list[index].id];
    setPlayer({ list, index, start: entry && !entry.finished ? entry.seconds : 0 });
  };

  // getCurrentTime conversa com o WebView; se ele não responder, não pode
  // travar o botão de fechar.
  const readCurrentTime = (): Promise<number | null> =>
    Promise.race([
      playerRef.current ? playerRef.current.getCurrentTime() : Promise.resolve(null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ]).catch(() => null);

  const closePlayer = async () => {
    const current = player ? player.list[player.index] : null;
    const seconds = await readCurrentTime();
    setPlayer(null);
    if (!current || seconds === null || seconds < 30) return;
    const finished = current.durationSeconds > 0 && seconds >= current.durationSeconds - 60;
    setHistory((h) => recordWatch(h, current, seconds, finished));
  };

  const onPlayerState = (state: PLAYER_STATES) => {
    if (state !== PLAYER_STATES.ENDED || !player) return;
    const current = player.list[player.index];
    setHistory((h) => recordWatch(h, current, current.durationSeconds, true));
    if (player.index < player.list.length - 1) {
      setPlayer({ ...player, index: player.index + 1, start: 0 });
    }
  };

  const shareVideo = (video: Video) => {
    Share.share({ message: `${video.title}\nhttps://youtu.be/${video.id}` }).catch(() => {});
  };

  const current = player ? player.list[player.index] : null;
  const upNext = player && player.index < player.list.length - 1 ? player.list[player.index + 1] : null;
  const continueList = useMemo(() => inProgress(history).slice(0, 10), [history]);

  // Cultos agrupados por mês, filtrados pela busca.
  const cultoSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (cultos ?? []).filter((v) => !q || v.title.toLowerCase().includes(q));
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {liveEvent && (
          <TouchableOpacity
            style={styles.liveBanner}
            onPress={() => Linking.openURL(LIVE_URL)}
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
                  {formatDate(hero.publishedAt)} · {formatDuration(hero.durationSeconds)}
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
                      <ThumbOverlay video={entry.video} history={history} styles={styles} />
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
              />
            ) : (
              renderState(seriesError, loadSeries)
            ))}

          {tab === 'cultos' && renderCultos()}
        </>
      )}

      <Modal
        visible={player !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closePlayer}
      >
        <View style={styles.modalContainer}>
          {/* Modal em tela cheia não herda a área segura: sem isso o botão de
              fechar fica sob o notch do iPhone. */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closePlayer}
              accessibilityRole="button"
              accessibilityLabel="Fechar vídeo"
            >
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {current?.title}
            </Text>
          </View>

          {current && player && (
            <>
              {/* key força remontar ao trocar de vídeo: o start só vale na montagem. */}
              <YoutubePlayer
                key={current.id}
                ref={playerRef}
                height={PLAYER_HEIGHT}
                videoId={current.id}
                play
                forceAndroidAutoplay
                initialPlayerParams={{ start: player.start }}
                onChangeState={onPlayerState}
              />
              <ScrollView style={styles.modalInfo} contentContainerStyle={{ padding: SIZES.padding }}>
                <Text style={styles.modalVideoTitle}>{current.title}</Text>
                <Text style={styles.modalMeta}>
                  {formatDate(current.publishedAt)}
                  {current.durationSeconds > 0 ? ` · ${formatDuration(current.durationSeconds)}` : ''}
                  {player.start > 0 ? ` · retomado em ${formatClock(player.start)}` : ''}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => shareVideo(current)}>
                    <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                    <Text style={styles.actionText}>Compartilhar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Linking.openURL(`https://youtu.be/${current.id}`)}
                  >
                    <Ionicons name="logo-youtube" size={20} color={colors.primary} />
                    <Text style={styles.actionText}>Abrir no YouTube</Text>
                  </TouchableOpacity>
                </View>

                {upNext && (
                  <TouchableOpacity
                    style={styles.upNext}
                    onPress={() => setPlayer({ ...player, index: player.index + 1, start: 0 })}
                  >
                    <Text style={styles.upNextLabel}>A SEGUIR</Text>
                    <View style={styles.upNextRow}>
                      {upNext.thumbnail ? (
                        <Image source={{ uri: upNext.thumbnail }} style={styles.upNextThumb} />
                      ) : null}
                      <Text style={styles.upNextTitle} numberOfLines={3}>
                        {upNext.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: SIZES.padding,
      marginTop: 24,
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
    durationBadge: {
      position: 'absolute',
      right: 5,
      bottom: 8,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    watchedBadge: {
      position: 'absolute',
      right: 5,
      bottom: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.primary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
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
    videoRow: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    videoThumbBox: {
      width: 140,
      aspectRatio: 16 / 9,
      backgroundColor: c.primaryLight,
    },
    videoInfo: {
      flex: 1,
      padding: 10,
      justifyContent: 'center',
    },
    videoTitle: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
    },
    videoMeta: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      marginTop: 4,
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
    modalContainer: {
      flex: 1,
      backgroundColor: c.black,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SIZES.padding,
      paddingBottom: 12,
      backgroundColor: c.black,
    },
    closeButton: {
      marginRight: 12,
    },
    modalTitle: {
      ...FONTS.medium,
      flex: 1,
      fontSize: SIZES.medium,
      color: '#fff',
    },
    modalInfo: {
      flex: 1,
      backgroundColor: c.background,
    },
    modalVideoTitle: {
      ...FONTS.bold,
      fontSize: SIZES.xl,
      color: c.text,
    },
    modalMeta: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 8,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 11,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    actionText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
    },
    upNext: {
      marginTop: 20,
      padding: 12,
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
    },
    upNextLabel: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      letterSpacing: 1,
    },
    upNextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    upNextThumb: {
      width: 110,
      aspectRatio: 16 / 9,
      borderRadius: 8,
    },
    upNextTitle: {
      ...FONTS.medium,
      flex: 1,
      fontSize: SIZES.font,
      color: c.text,
    },
  });

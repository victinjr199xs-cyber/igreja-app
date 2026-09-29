import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import YoutubePlayer, { PLAYER_STATES, YoutubeIframeRef } from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIZES, FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';
import {
  Serie,
  Video,
  WatchProgress,
  fetchSeries,
  fetchSerieVideos,
  fetchCultos,
  loadProgress,
  saveProgress,
} from '../services/youtubeService';

const { width } = Dimensions.get('window');
const PLAYER_HEIGHT = Math.round((width * 9) / 16);

type Tab = 'series' | 'cultos';

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

interface VideoRowProps {
  video: Video;
  prefix?: string;
  onPress: () => void;
}

function VideoRow({ video, prefix = '', onPress }: VideoRowProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.videoRow} onPress={onPress}>
      <View style={styles.videoThumbBox}>
        {video.thumbnail ? (
          <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} />
        ) : null}
        {video.durationSeconds > 0 && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.durationSeconds)}</Text>
          </View>
        )}
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

export default function SermonsScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('series');

  const [series, setSeries] = useState<Serie[] | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [openSerie, setOpenSerie] = useState<Serie | null>(null);
  const [serieVideos, setSerieVideos] = useState<Video[] | null>(null);
  const [serieError, setSerieError] = useState<string | null>(null);

  const [cultos, setCultos] = useState<Video[] | null>(null);
  const [cultosToken, setCultosToken] = useState<string | undefined>();
  const [cultosError, setCultosError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [progress, setProgress] = useState<WatchProgress | null>(null);
  const playerRef = useRef<YoutubeIframeRef | null>(null);

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

  useEffect(() => {
    loadSeries();
    loadProgress().then(setProgress);
  }, [loadSeries]);

  // Cultos só são buscados na primeira vez que a aba é aberta.
  useEffect(() => {
    if (tab === 'cultos' && cultos === null && !cultosError) loadCultos();
  }, [tab, cultos, cultosError, loadCultos]);

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

  const play = (list: Video[], index: number, start = 0) => {
    setPlayer({ list, index, start });
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
    if (!current || seconds === null) return;

    // Guarda só se a pessoa parou no meio. Assistiu até o fim: limpa.
    if (seconds > 30 && seconds < current.durationSeconds - 60) {
      const next = { video: current, seconds: Math.floor(seconds) };
      setProgress(next);
      saveProgress(next);
    } else if (progress?.video.id === current.id) {
      setProgress(null);
      saveProgress(null);
    }
  };

  const dismissProgress = () => {
    setProgress(null);
    saveProgress(null);
  };

  const onPlayerState = (state: PLAYER_STATES) => {
    if (state !== PLAYER_STATES.ENDED || !player) return;
    if (player.index < player.list.length - 1) {
      setPlayer({ ...player, index: player.index + 1, start: 0 });
    }
  };

  const current = player ? player.list[player.index] : null;
  const upNext = player && player.index < player.list.length - 1 ? player.list[player.index + 1] : null;

  const renderSerieVideo = useCallback(
    ({ item, index }: { item: Video; index: number }) => (
      <VideoRow
        video={item}
        prefix={`${index + 1}. `}
        onPress={() => setPlayer({ list: serieVideos ?? [], index, start: 0 })}
      />
    ),
    [serieVideos]
  );

  const renderCulto = useCallback(
    ({ item, index }: { item: Video; index: number }) => (
      <VideoRow
        video={item}
        onPress={() => setPlayer({ list: cultos ?? [], index, start: 0 })}
      />
    ),
    [cultos]
  );

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

  const renderSerie = ({ item }: { item: Serie }) => (
    <TouchableOpacity style={styles.serieCard} onPress={() => openSerieView(item)}>
      <View style={styles.serieThumbBox}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.serieThumb} />
        ) : (
          <Ionicons name="albums-outline" size={32} color={colors.white} />
        )}
        <View style={styles.countBadge}>
          <Ionicons name="play" size={10} color={colors.white} />
          <Text style={styles.countText}>{item.videoCount}</Text>
        </View>
      </View>
      <Text style={styles.serieTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const loadedCount = serieVideos?.length ?? openSerie?.videoCount ?? 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Pregações" subtitle="Séries e cultos do canal" />

      {openSerie ? (
        <>
          <View style={styles.serieBar}>
            <TouchableOpacity
              onPress={closeSerie}
              style={styles.serieBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar para as séries"
            >
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.serieBarInfo}>
              <Text style={styles.serieBarTitle} numberOfLines={1}>
                {openSerie.title}
              </Text>
              {/* Depois de carregar, a contagem real: a do YouTube inclui vídeos privados. */}
              <Text style={styles.serieBarCount}>
                {loadedCount} {loadedCount === 1 ? 'ministração' : 'ministrações'}
              </Text>
            </View>
          </View>
          {serieVideos ? (
            <FlatList
              data={serieVideos}
              renderItem={renderSerieVideo}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Esta série ainda não tem vídeos disponíveis.
                </Text>
              }
            />
          ) : (
            renderState(serieError, () => openSerieView(openSerie))
          )}
        </>
      ) : (
        <>
          {/* Dois botões lado a lado, não um dentro do outro: aninhados, o leitor
              de tela funde tudo num elemento só e o "X" fica inalcançável. */}
          {progress && (
            <View style={styles.continueCard}>
              <TouchableOpacity
                style={styles.continueMain}
                onPress={() => play([progress.video], 0, progress.seconds)}
                accessibilityRole="button"
                accessibilityLabel={`Continuar assistindo ${progress.video.title}, a partir de ${formatClock(progress.seconds)}`}
              >
                <Ionicons name="play-circle" size={36} color={colors.secondary} />
                <View style={styles.continueInfo}>
                  <Text style={styles.continueLabel}>Continuar assistindo</Text>
                  <Text style={styles.continueTitle} numberOfLines={1}>
                    {progress.video.title}
                  </Text>
                  <Text style={styles.continueMeta}>Parou em {formatClock(progress.seconds)}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={dismissProgress}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Dispensar"
              >
                <Ionicons name="close" size={20} color={colors.gray} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.tabs}>
            {(['series', 'cultos'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'series' ? 'Séries' : 'Cultos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'series' &&
            (series ? (
              <FlatList
                data={series}
                renderItem={renderSerie}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.serieColumns}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              renderState(seriesError, loadSeries)
            ))}

          {tab === 'cultos' &&
            (cultos ? (
              <FlatList
                data={cultos}
                renderItem={renderCulto}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListFooterComponent={
                  cultosToken ? (
                    <TouchableOpacity
                      style={styles.loadMore}
                      onPress={loadMoreCultos}
                      disabled={loadingMore}
                    >
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
            ))}
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
          <View style={[styles.modalHeader, { paddingTop: insets.top + SIZES.padding }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closePlayer}
              accessibilityRole="button"
              accessibilityLabel="Fechar vídeo"
            >
              <Ionicons name="close" size={28} color={colors.white} />
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
              <View style={styles.modalInfo}>
                <Text style={styles.modalVideoTitle}>{current.title}</Text>
                <Text style={styles.modalMeta}>
                  {formatDate(current.publishedAt)}
                  {current.durationSeconds > 0 ? ` · ${formatDuration(current.durationSeconds)}` : ''}
                </Text>

                {upNext && (
                  <TouchableOpacity
                    style={styles.upNext}
                    onPress={() => setPlayer({ ...player, index: player.index + 1, start: 0 })}
                  >
                    <Text style={styles.upNextLabel}>A SEGUIR</Text>
                    <View style={styles.upNextRow}>
                      <Ionicons name="play-forward" size={20} color={colors.primary} />
                      <Text style={styles.upNextTitle} numberOfLines={2}>
                        {upNext.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
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
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    padding: 12,
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: c.secondary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  continueLabel: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: c.secondary,
  },
  continueTitle: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: c.text,
    marginTop: 2,
  },
  continueMeta: {
    fontSize: SIZES.small,
    color: c.textLight,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    margin: SIZES.padding,
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.radius - 4,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: c.primary,
  },
  tabText: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: c.textLight,
  },
  tabTextActive: {
    color: c.white,
  },
  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 24,
  },
  serieColumns: {
    gap: 12,
  },
  serieCard: {
    flex: 1,
    marginBottom: 16,
  },
  serieThumbBox: {
    aspectRatio: 16 / 9,
    borderRadius: SIZES.radius,
    backgroundColor: c.primaryLight,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serieThumb: {
    width: '100%',
    height: '100%',
  },
  countBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.black + 'B3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countText: {
    color: c.white,
    fontSize: SIZES.small,
    fontWeight: '700',
  },
  serieTitle: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: c.text,
    marginTop: 6,
  },
  serieBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  serieBack: {
    paddingRight: 8,
  },
  serieBarInfo: {
    flex: 1,
  },
  serieBarTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: c.text,
  },
  serieBarCount: {
    fontSize: SIZES.small,
    color: c.textLight,
    marginTop: 2,
  },
  videoRow: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
    marginBottom: 10,
    overflow: 'hidden',
  },
  videoThumbBox: {
    width: 140,
    aspectRatio: 16 / 9,
    backgroundColor: c.primaryLight,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: c.black + 'B3',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  durationText: {
    color: c.white,
    fontSize: 11,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: c.text,
  },
  videoMeta: {
    fontSize: SIZES.small,
    color: c.textLight,
    marginTop: 4,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
  },
  loadMoreText: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: c.primary,
  },
  emptyText: {
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
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: c.text,
    marginTop: 12,
    textAlign: 'center',
  },
  centerDetail: {
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
    color: c.white,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: c.black,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: c.primary,
  },
  closeButton: {
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: c.white,
  },
  modalInfo: {
    flex: 1,
    backgroundColor: c.card,
    padding: SIZES.padding,
  },
  modalVideoTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: c.text,
  },
  modalMeta: {
    fontSize: SIZES.font,
    color: c.textLight,
    marginTop: 8,
  },
  upNext: {
    marginTop: 24,
    padding: 14,
    backgroundColor: c.lightGray,
    borderRadius: SIZES.radius,
  },
  upNextLabel: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: c.textLight,
    letterSpacing: 1,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  upNextTitle: {
    flex: 1,
    fontSize: SIZES.font,
    fontWeight: '600',
    color: c.text,
  },
});

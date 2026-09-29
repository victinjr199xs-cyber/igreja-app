import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Linking,
  Share,
  useWindowDimensions,
} from 'react-native';
import YoutubePlayer, { PLAYER_STATES, YoutubeIframeRef } from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, SIZES, Palette } from '../../constants/theme';
import { useThemedStyles } from '../../context/SettingsContext';
import { Video } from '../../services/youtubeService';
import { formatClock, formatDuration, formatShortDate } from '../../utils/format';

interface Props {
  /** Vídeo tocando; null fecha o modal. */
  video: Video | null;
  /** Segundo em que começa (retomar de onde parou). */
  start: number;
  upNext: Video | null;
  playerRef: React.RefObject<YoutubeIframeRef | null>;
  onClose: () => void;
  onChangeState: (state: PLAYER_STATES) => void;
  onPlayNext: () => void;
}

/**
 * Player em tela cheia com o player oficial do YouTube (única forma permitida
 * pelos Termos), compartilhar, abrir no YouTube e "a seguir".
 */
export default function VideoPlayerModal({
  video,
  start,
  upNext,
  playerRef,
  onClose,
  onChangeState,
  onPlayNext,
}: Props) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const playerHeight = Math.round((width * 9) / 16);

  const share = (v: Video) =>
    Share.share({ message: `${v.title}\nhttps://youtu.be/${v.id}` }).catch(() => {});

  return (
    <Modal visible={video !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Modal em tela cheia não herda a área segura: sem isso o botão de
            fechar fica sob o notch do iPhone. */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.close}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar vídeo"
          >
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {video?.title}
          </Text>
        </View>

        {video && (
          <>
            {/* key força remontar ao trocar de vídeo: o start só vale na montagem. */}
            <YoutubePlayer
              key={video.id}
              ref={playerRef}
              height={playerHeight}
              videoId={video.id}
              play
              forceAndroidAutoplay
              initialPlayerParams={{ start }}
              onChangeState={onChangeState}
            />
            <ScrollView style={styles.info} contentContainerStyle={{ padding: SIZES.padding }}>
              <Text style={styles.title}>{video.title}</Text>
              <Text style={styles.meta}>
                {formatShortDate(video.publishedAt)}
                {video.durationSeconds > 0 ? ` · ${formatDuration(video.durationSeconds)}` : ''}
                {start > 0 ? ` · retomado em ${formatClock(start)}` : ''}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.action} onPress={() => share(video)}>
                  <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Compartilhar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => Linking.openURL(`https://youtu.be/${video.id}`)}
                >
                  <Ionicons name="logo-youtube" size={20} color={colors.primary} />
                  <Text style={styles.actionText}>Abrir no YouTube</Text>
                </TouchableOpacity>
              </View>

              {upNext && (
                <TouchableOpacity style={styles.upNext} onPress={onPlayNext}>
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
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.black,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SIZES.padding,
      paddingBottom: 12,
      backgroundColor: c.black,
    },
    close: {
      marginRight: 12,
    },
    headerTitle: {
      ...FONTS.medium,
      flex: 1,
      fontSize: SIZES.medium,
      color: '#fff',
    },
    info: {
      flex: 1,
      backgroundColor: c.background,
    },
    title: {
      ...FONTS.bold,
      fontSize: SIZES.xl,
      color: c.text,
    },
    meta: {
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
    action: {
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

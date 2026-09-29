import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../../constants/theme';
import { useThemedStyles } from '../../context/SettingsContext';
import { Video, WatchHistory } from '../../services/youtubeService';
import { formatDuration, formatShortDate } from '../../utils/format';

/** Fração assistida (0–1), ou null se o vídeo nunca foi aberto. */
export function watchedFraction(history: WatchHistory, video: Video): number | null {
  const entry = history[video.id];
  if (!entry) return null;
  if (entry.finished) return 1;
  return video.durationSeconds > 0 ? Math.min(1, entry.seconds / video.durationSeconds) : null;
}

/**
 * Sobre a miniatura: duração (ou selo "Assistido") no canto e barra de
 * progresso embaixo. O pai precisa ter position relativa (padrão) e
 * overflow hidden.
 */
export function ThumbOverlay({ video, history }: { video: Video; history: WatchHistory }) {
  const { styles } = useThemedStyles(makeStyles);
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

interface Props {
  video: Video;
  history: WatchHistory;
  /** Ex.: "3. " na lista de uma série. */
  prefix?: string;
  onPress: () => void;
}

/** Linha de vídeo: miniatura com duração/progresso, título e data. */
export default function VideoRow({ video, history, prefix = '', onPress }: Props) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.thumbBox}>
        {video.thumbnail ? <Image source={{ uri: video.thumbnail }} style={styles.thumb} /> : null}
        <ThumbOverlay video={video} history={history} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={3}>
          {prefix}
          {video.title}
        </Text>
        <Text style={styles.meta}>{formatShortDate(video.publishedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    thumbBox: {
      width: 140,
      aspectRatio: 16 / 9,
      backgroundColor: c.primaryLight,
    },
    thumb: {
      width: '100%',
      height: '100%',
    },
    info: {
      flex: 1,
      padding: 10,
      justifyContent: 'center',
    },
    title: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
    },
    meta: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      marginTop: 4,
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
    badgeText: {
      ...FONTS.medium,
      color: '#fff',
      fontSize: 11,
    },
  });

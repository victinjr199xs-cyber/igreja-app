import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

const RADIO_STATIONS = [
  {
    id: '1',
    name: 'Rádio Gospel FM',
    description: 'Música gospel 24 horas',
    url: 'https://streaming.radio.co/s2f5e3f0e5/listen',
    icon: 'musical-notes',
  },
  {
    id: '2',
    name: 'Rádio Cruz',
    description: 'Palavra e adoração',
    url: 'https://streaming.radio.co/s3a4d5e6f7/listen',
    icon: 'heart',
  },
  {
    id: '3',
    name: 'Rádio Vida',
    description: 'Músicas de louvor',
    url: 'https://streaming.radio.co/s4b5c6d7e8/listen',
    icon: 'sunny',
  },
];

const PLAYLIST = [
  { id: '1', title: 'Amazing Grace', artist: 'Chris Tomlin', duration: '5:32' },
  { id: '2', title: 'How Great Is Our God', artist: 'Chris Tomlin', duration: '4:26' },
  { id: '3', title: 'Reckless Love', artist: 'Cory Asbury', duration: '5:34' },
  { id: '4', title: 'Good Good Father', artist: 'Chris Tomlin', duration: '4:43' },
  { id: '5', title: 'Oceans', artist: 'Hillsong United', duration: '8:56' },
  { id: '6', title: 'What A Beautiful Name', artist: 'Hillsong Worship', duration: '5:42' },
  { id: '7', title: 'Chain Breaker', artist: 'Zach Williams', duration: '3:51' },
  { id: '8', title: 'Who You Say I Am', artist: 'Hillsong Worship', duration: '4:41' },
];

export default function RadioScreen() {
  const [currentTrack, setCurrentTrack] = useState(PLAYLIST[0]);
  const [selectedStation, setSelectedStation] = useState(RADIO_STATIONS[0]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // O player é recriado (e o anterior liberado) sempre que a estação muda.
  const player = useAudioPlayer(selectedStation.url);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const playTrack = (track: typeof PLAYLIST[0]) => {
    setCurrentTrack(track);
    player.play();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rádio Cristã</Text>
        <Text style={styles.headerSubtitle}>Música e adoração 24h</Text>
      </View>

      <View style={styles.playerSection}>
        <View style={styles.albumArtContainer}>
          <Animated.View style={[styles.albumArt, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.albumArtInner}>
              <Ionicons
                name={isPlaying ? 'musical-notes' : 'radio'}
                size={64}
                color={COLORS.white}
              />
            </View>
          </Animated.View>
          <View style={[styles.liveIndicator, isPlaying && styles.liveIndicatorActive]}>
            <View style={[styles.liveDot, isPlaying && styles.liveDotActive]} />
            <Text style={styles.liveText}>{isPlaying ? 'AO VIVO' : 'PAUSADO'}</Text>
          </View>
        </View>

        <Text style={styles.trackTitle}>{currentTrack.title}</Text>
        <Text style={styles.trackArtist}>{currentTrack.artist}</Text>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color={COLORS.white}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressBar}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '35%' }]} />
          </View>
          <View style={styles.progressTime}>
            <Text style={styles.timeText}>1:58</Text>
            <Text style={styles.timeText}>{currentTrack.duration}</Text>
          </View>
        </View>
      </View>

      <View style={styles.stationsSection}>
        <Text style={styles.sectionTitle}>Estações</Text>
        <View style={styles.stationsList}>
          {RADIO_STATIONS.map((station) => (
            <TouchableOpacity
              key={station.id}
              style={[
                styles.stationCard,
                selectedStation.id === station.id && styles.stationCardActive,
              ]}
              onPress={() => setSelectedStation(station)}
            >
              <Ionicons
                name={station.icon as any}
                size={24}
                color={selectedStation.id === station.id ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[
                  styles.stationName,
                  selectedStation.id === station.id && styles.stationNameActive,
                ]}
                numberOfLines={1}
              >
                {station.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.playlistSection}>
        <Text style={styles.sectionTitle}>Playlist</Text>
        <Animated.ScrollView
          style={styles.playlistList}
          showsVerticalScrollIndicator={false}
        >
          {PLAYLIST.map((track) => (
            <TouchableOpacity
              key={track.id}
              style={[
                styles.playlistItem,
                currentTrack.id === track.id && styles.playlistItemActive,
              ]}
              onPress={() => playTrack(track)}
            >
              <View style={styles.playlistItemLeft}>
                <View style={[
                  styles.playlistNumber,
                  currentTrack.id === track.id && styles.playlistNumberActive,
                ]}>
                  {currentTrack.id === track.id && isPlaying ? (
                    <Ionicons name="volume-high" size={14} color={COLORS.white} />
                  ) : (
                    <Text style={[
                      styles.playlistNumberText,
                      currentTrack.id === track.id && styles.playlistNumberTextActive,
                    ]}>
                      {PLAYLIST.indexOf(track) + 1}
                    </Text>
                  )}
                </View>
                <View style={styles.playlistItemInfo}>
                  <Text
                    style={[
                      styles.playlistItemTitle,
                      currentTrack.id === track.id && styles.playlistItemTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  <Text style={styles.playlistItemArtist} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>
              </View>
              <Text style={styles.playlistItemDuration}>{track.duration}</Text>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
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
  playerSection: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  albumArt: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  albumArtInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  liveIndicatorActive: {
    backgroundColor: COLORS.error + '20',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
  },
  liveDotActive: {
    backgroundColor: COLORS.error,
  },
  liveText: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.gray,
  },
  trackTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 12,
  },
  trackArtist: {
    fontSize: SIZES.medium,
    color: COLORS.textLight,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    marginTop: 20,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  progressBar: {
    width: '100%',
    marginTop: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
  },
  stationsSection: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  stationsList: {
    flexDirection: 'row',
    gap: 12,
  },
  stationCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationCardActive: {
    backgroundColor: COLORS.primary,
  },
  stationName: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  stationNameActive: {
    color: COLORS.white,
  },
  playlistSection: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  playlistList: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 8,
  },
  playlistItemActive: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  playlistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistNumberActive: {
    backgroundColor: COLORS.primary,
  },
  playlistNumberText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  playlistNumberTextActive: {
    color: COLORS.white,
  },
  playlistItemInfo: {
    flex: 1,
  },
  playlistItemTitle: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: COLORS.text,
  },
  playlistItemTitleActive: {
    color: COLORS.primary,
  },
  playlistItemArtist: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  playlistItemDuration: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
    marginLeft: 12,
  },
});

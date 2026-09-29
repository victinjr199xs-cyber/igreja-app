import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

// Streams oficiais das emissoras, todos em HTTPS (iOS e Android bloqueiam HTTP
// puro). Novo Tempo é HLS (.m3u8), que o expo-audio toca nas duas plataformas.
const RADIO_STATIONS = [
  {
    id: 'vinha',
    name: 'Vinha FM',
    description: '91.9 FM · Goiânia',
    url: 'https://streaming.vinhafm.com.br/stream',
    icon: 'leaf',
  },
  {
    id: 'melodia',
    name: 'Melodia FM',
    description: '97.5 FM · Rio de Janeiro',
    // O redirect do StreamTheWorld escolhe um servidor disponível a cada conexão.
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/MELODIAFMAAC.aac',
    icon: 'musical-notes',
  },
  {
    id: 'novotempo',
    name: 'Novo Tempo',
    description: 'Rede Novo Tempo de Rádio',
    url: 'https://streamradio.novotempo.com/CDN-RADIO-PT/smil:radionovotempo.smil/playlist.m3u8',
    icon: 'heart',
  },
  {
    id: 'super',
    name: 'Rádio Super',
    description: '100.5 FM · Belo Horizonte',
    url: 'https://servidor32.brlogic.com:8200/live',
    icon: 'sunny',
  },
];

type Station = (typeof RADIO_STATIONS)[number];

export default function RadioScreen() {
  const [selectedStation, setSelectedStation] = useState<Station>(RADIO_STATIONS[0]);
  // Intenção do usuário, separada de status.playing: ao trocar de estação o
  // player novo nasce parado e precisa saber se deve começar a tocar.
  const [wantsToPlay, setWantsToPlay] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // O player é recriado (e o anterior liberado) sempre que a estação muda.
  const player = useAudioPlayer(selectedStation.url);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  const isConnecting = wantsToPlay && !isPlaying;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (wantsToPlay) player.play();
  }, [player]);

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
    if (wantsToPlay) {
      setWantsToPlay(false);
      player.pause();
    } else {
      setWantsToPlay(true);
      player.play();
    }
  };

  const playStation = (station: Station) => {
    setWantsToPlay(true);
    if (station.id === selectedStation.id) {
      player.play();
    } else {
      setSelectedStation(station);
    }
  };

  const skipStation = (step: 1 | -1) => {
    const index = RADIO_STATIONS.findIndex((s) => s.id === selectedStation.id);
    const next = RADIO_STATIONS[(index + step + RADIO_STATIONS.length) % RADIO_STATIONS.length];
    setSelectedStation(next);
  };

  const liveLabel = isPlaying ? 'AO VIVO' : isConnecting ? 'CONECTANDO…' : 'PAUSADO';

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
            <Text style={styles.liveText}>{liveLabel}</Text>
          </View>
        </View>

        <Text style={styles.trackTitle}>{selectedStation.name}</Text>
        <Text style={styles.trackArtist}>{selectedStation.description}</Text>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={() => skipStation(-1)}>
            <Ionicons name="play-skip-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            {isConnecting ? (
              <ActivityIndicator size="large" color={COLORS.white} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={36}
                color={COLORS.white}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => skipStation(1)}>
            <Ionicons name="play-skip-forward" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.playlistSection}>
        <Text style={styles.sectionTitle}>Estações</Text>
        <ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
          {RADIO_STATIONS.map((station) => {
            const active = selectedStation.id === station.id;
            return (
              <TouchableOpacity
                key={station.id}
                style={[styles.playlistItem, active && styles.playlistItemActive]}
                onPress={() => playStation(station)}
              >
                <View style={styles.playlistItemLeft}>
                  <View style={[styles.playlistNumber, active && styles.playlistNumberActive]}>
                    <Ionicons
                      name={(active && isPlaying ? 'volume-high' : station.icon) as any}
                      size={16}
                      color={active ? COLORS.white : COLORS.primary}
                    />
                  </View>
                  <View style={styles.playlistItemInfo}>
                    <Text
                      style={[styles.playlistItemTitle, active && styles.playlistItemTitleActive]}
                      numberOfLines={1}
                    >
                      {station.name}
                    </Text>
                    <Text style={styles.playlistItemArtist} numberOfLines={1}>
                      {station.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  playlistSection: {
    flex: 1,
    padding: SIZES.padding,
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
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';

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

// Capa exibida na notificação e na tela de bloqueio. Precisa ser uma URL
// remota; o repositório é público, então o ícone do app serve.
const ARTWORK_URL =
  'https://raw.githubusercontent.com/victinjr199xs-cyber/igreja-app/main/assets/icon.png';

export default function RadioScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const [selectedStation, setSelectedStation] = useState<Station>(RADIO_STATIONS[0]);
  // Intenção do usuário, separada de status.playing: ao trocar de estação o
  // player novo nasce parado e precisa saber se deve começar a tocar.
  const [wantsToPlay, setWantsToPlay] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // O player é recriado (e o anterior liberado) sempre que a estação muda.
  const player = useAudioPlayer(selectedStation.url);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  // Pausado pela notificação ou tela de bloqueio o stream segue carregado e
  // sem buffer: isso é "pausado", não "conectando".
  const isConnecting = wantsToPlay && !isPlaying && (status.isBuffering || !status.isLoaded);

  useEffect(() => {
    // shouldPlayInBackground mantém o áudio com o app minimizado ou a tela
    // bloqueada. Os controles da tela de bloqueio exigem 'doNotMix'.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (wantsToPlay) player.play();
  }, [player]);

  // Notificação de mídia (Android) e controles da tela de bloqueio / Central de
  // Controle (iOS). No Android é também o que mantém o serviço em primeiro
  // plano: sem ele, o sistema corta o áudio em segundo plano após ~3 min.
  // Cada player novo (troca de estação) precisa ser registrado de novo.
  useEffect(() => {
    if (!wantsToPlay) return;
    player.setActiveForLockScreen(
      true,
      {
        title: selectedStation.name,
        artist: selectedStation.description,
        albumTitle: 'Igreja App · Rádio',
        artworkUrl: ARTWORK_URL,
      },
      // Rádio ao vivo não tem como avançar ou voltar.
      { showSeekForward: false, showSeekBackward: false },
    );
  }, [player, wantsToPlay]);

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
    // Decide pelo estado real, não só pela intenção: o áudio pode ter sido
    // pausado ou retomado pela notificação sem passar por esta tela.
    if (isPlaying || isConnecting) {
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
    setWantsToPlay(isPlaying || isConnecting);
    setSelectedStation(next);
  };

  const liveLabel = isPlaying ? 'AO VIVO' : isConnecting ? 'CONECTANDO…' : 'PAUSADO';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Rádio" subtitle="Música e adoração ao vivo" />

      <View style={styles.playerSection}>
        <View style={styles.albumArtContainer}>
          <Animated.View style={[styles.albumArt, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.albumArtInner}>
              <Ionicons
                name={isPlaying ? 'musical-notes' : 'radio'}
                size={52}
                color={colors.white}
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
            <Ionicons name="play-skip-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
            {isConnecting ? (
              <ActivityIndicator size="large" color={colors.white} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={36}
                color={colors.white}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => skipStation(1)}>
            <Ionicons name="play-skip-forward" size={28} color={colors.text} />
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
                      color={active ? colors.white : colors.primary}
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
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  playerSection: {
    backgroundColor: c.card,
    padding: SIZES.padding,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  albumArt: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: c.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  albumArtInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: c.primaryLight,
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
    backgroundColor: c.lightGray,
    borderRadius: 12,
  },
  liveIndicatorActive: {
    backgroundColor: c.error + '20',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.gray,
  },
  liveDotActive: {
    backgroundColor: c.error,
  },
  liveText: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: c.gray,
  },
  trackTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: c.text,
    textAlign: 'center',
    marginTop: 12,
  },
  trackArtist: {
    fontSize: SIZES.medium,
    color: c.textLight,
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
    backgroundColor: c.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: c.text,
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
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 8,
  },
  playlistItemActive: {
    backgroundColor: c.primary + '10',
    borderWidth: 1,
    borderColor: c.primary + '30',
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
    backgroundColor: c.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistNumberActive: {
    backgroundColor: c.primary,
  },
  playlistItemInfo: {
    flex: 1,
  },
  playlistItemTitle: {
    fontSize: SIZES.font,
    fontWeight: '600',
    color: c.text,
  },
  playlistItemTitleActive: {
    color: c.primary,
  },
  playlistItemArtist: {
    fontSize: SIZES.small,
    color: c.textLight,
    marginTop: 2,
  },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';
import { onAppEvent } from '../services/appEvents';
import {
  RADIO_LANGUAGES,
  RADIO_STATIONS,
  RadioLanguage,
  RadioStation,
} from '../data/radioStations';

// Capa exibida na notificação e na tela de bloqueio. Precisa ser uma URL
// remota; o repositório é público, então o ícone do app serve.
const ARTWORK_URL =
  'https://raw.githubusercontent.com/victinjr199xs-cyber/igreja-app/main/assets/icon.png';

const LAST_STATION_KEY = 'radio:last';

// Stream que não começa nesse tempo provavelmente está fora do ar.
const CONNECT_TIMEOUT_MS = 20000;

/** "Rede Aleluia" -> "RA"; "K-LOVE" -> "KL"; "Air1" -> "AI". */
function initials(name: string): string {
  const words = name.split(/[\s\-.]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function RadioScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const [selectedStation, setSelectedStation] = useState<RadioStation>(RADIO_STATIONS[0]);
  const [language, setLanguage] = useState<RadioLanguage>('pt');
  // Intenção do usuário, separada de status.playing: ao trocar de estação o
  // player novo nasce parado e precisa saber se deve começar a tocar.
  const [wantsToPlay, setWantsToPlay] = useState(false);
  const [failed, setFailed] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // O player é recriado (e o anterior liberado) sempre que a estação muda.
  const player = useAudioPlayer(selectedStation.url);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  // Pausado pela notificação ou tela de bloqueio o stream segue carregado e
  // sem buffer: isso é "pausado", não "conectando".
  const isConnecting = wantsToPlay && !isPlaying && (status.isBuffering || !status.isLoaded);

  const stations = useMemo(
    () => RADIO_STATIONS.filter((s) => s.language === language),
    [language]
  );

  useEffect(() => {
    // shouldPlayInBackground mantém o áudio com o app minimizado ou a tela
    // bloqueada. Os controles da tela de bloqueio exigem 'doNotMix'.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});

    // Abre na última estação ouvida (parada, sem tocar sozinha).
    AsyncStorage.getItem(LAST_STATION_KEY)
      .then((id) => {
        const station = RADIO_STATIONS.find((s) => s.id === id);
        if (station) {
          setSelectedStation(station);
          setLanguage(station.language);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (wantsToPlay) player.play();
  }, [player]);

  // Um vídeo começou na aba Pregações (ou pela Início): pausa a rádio, que
  // seguiria tocando por cima. A pessoa retoma pelo play quando quiser.
  useEffect(
    () =>
      onAppEvent('video-start', () => {
        setWantsToPlay(false);
        player.pause();
      }),
    [player]
  );

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
        albumTitle: 'Casa de Adoração · Rádio',
        artworkUrl: ARTWORK_URL,
      },
      // Rádio ao vivo não tem como avançar ou voltar.
      { showSeekForward: false, showSeekBackward: false },
    );
  }, [player, wantsToPlay]);

  useEffect(() => {
    if (!isConnecting) return;
    const timer = setTimeout(() => {
      setFailed(true);
      setWantsToPlay(false);
      player.pause();
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isConnecting, player]);

  useEffect(() => {
    if (!isPlaying) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [isPlaying]);

  const selectStation = (station: RadioStation, play: boolean) => {
    setFailed(false);
    setWantsToPlay(play);
    AsyncStorage.setItem(LAST_STATION_KEY, station.id).catch(() => {});
    if (station.id === selectedStation.id) {
      if (play) player.play();
    } else {
      setSelectedStation(station);
    }
  };

  // Vindo da Início ("continue de onde parou"): toca a estação pedida.
  const route = useRoute<RouteProp<ParamListBase>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const playStationId = (route.params as { playStationId?: string } | undefined)?.playStationId;
  useEffect(() => {
    if (!playStationId) return;
    const station = RADIO_STATIONS.find((s) => s.id === playStationId);
    if (station) {
      setLanguage(station.language);
      selectStation(station, true);
    }
    navigation.setParams({ playStationId: undefined });
  }, [playStationId]);

  const togglePlayback = () => {
    // Decide pelo estado real, não só pela intenção: o áudio pode ter sido
    // pausado ou retomado pela notificação sem passar por esta tela.
    if (isPlaying || isConnecting) {
      setWantsToPlay(false);
      player.pause();
    } else {
      selectStation(selectedStation, true);
    }
  };

  // Anterior/próxima dentro do idioma da estação atual.
  const skipStation = (step: 1 | -1) => {
    const list = RADIO_STATIONS.filter((s) => s.language === selectedStation.language);
    const index = list.findIndex((s) => s.id === selectedStation.id);
    const next = list[(index + step + list.length) % list.length];
    selectStation(next, isPlaying || isConnecting);
  };

  const liveLabel = failed
    ? 'SEM SINAL'
    : isPlaying
      ? 'AO VIVO'
      : isConnecting
        ? 'CONECTANDO…'
        : 'PAUSADO';

  const ringStyle = {
    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
  };

  const renderStation = ({ item }: { item: RadioStation }) => {
    const active = item.id === selectedStation.id;
    return (
      <TouchableOpacity
        style={[styles.stationRow, active && styles.stationRowActive]}
        onPress={() => selectStation(item, true)}
        accessibilityRole="button"
        accessibilityLabel={`Ouvir ${item.name}`}
      >
        <View style={[styles.monogram, active && styles.monogramActive]}>
          <Text style={[styles.monogramText, active && styles.monogramTextActive]}>
            {initials(item.name)}
          </Text>
        </View>
        <View style={styles.stationInfo}>
          <Text style={[styles.stationName, active && styles.stationNameActive]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.stationDesc} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
        {active && isConnecting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons
            name={active && isPlaying ? 'volume-high' : 'play-circle-outline'}
            size={26}
            color={active ? colors.primary : colors.gray}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Rádio" subtitle="Rádios cristãs ao vivo" />

      <View style={styles.player}>
        <View style={styles.playerTop}>
          <View style={styles.discBox}>
            <Animated.View style={[styles.discRing, ringStyle]} />
            <View style={styles.disc}>
              <Text style={styles.discText}>{initials(selectedStation.name)}</Text>
            </View>
          </View>
          <View style={styles.playerInfo}>
            <View
              style={[
                styles.liveChip,
                isPlaying && styles.liveChipOn,
                failed && styles.liveChipFailed,
              ]}
            >
              <View style={[styles.liveDot, (isPlaying || failed) && styles.liveDotOn]} />
              <Text style={[styles.liveText, (isPlaying || failed) && styles.liveTextOn]}>
                {liveLabel}
              </Text>
            </View>
            <Text style={styles.playerName} numberOfLines={1}>
              {selectedStation.name}
            </Text>
            <Text style={styles.playerDesc} numberOfLines={1}>
              {failed ? 'Rádio fora do ar agora. Tente outra.' : selectedStation.description}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => skipStation(-1)}
            accessibilityLabel="Estação anterior"
          >
            <Ionicons name="play-skip-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlayback}
            accessibilityLabel={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isConnecting ? (
              <ActivityIndicator size="large" color={colors.white} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color={colors.white}
                style={isPlaying ? undefined : { marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => skipStation(1)}
            accessibilityLabel="Próxima estação"
          >
            <Ionicons name="play-skip-forward" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        {RADIO_LANGUAGES.map((lang) => {
          const active = lang.id === language;
          return (
            <TouchableOpacity
              key={lang.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setLanguage(lang.id)}
            >
              <Text style={styles.tabFlag}>{lang.flag}</Text>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{lang.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={stations}
        renderItem={renderStation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <Text style={styles.footer}>
            {stations.length} rádios · transmissão ao vivo de cada emissora
          </Text>
        }
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
    player: {
      backgroundColor: c.card,
      margin: SIZES.padding,
      marginBottom: 12,
      borderRadius: SIZES.radius + 4,
      padding: SIZES.padding,
      borderWidth: 1,
      borderColor: c.border,
    },
    playerTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    discBox: {
      width: 76,
      height: 76,
      justifyContent: 'center',
      alignItems: 'center',
    },
    discRing: {
      position: 'absolute',
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: c.primary,
    },
    disc: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    discText: {
      ...FONTS.bold,
      fontSize: 26,
      color: c.white,
    },
    playerInfo: {
      flex: 1,
      marginLeft: 16,
    },
    liveChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: c.lightGray,
    },
    liveChipOn: {
      backgroundColor: c.error + '22',
    },
    liveChipFailed: {
      backgroundColor: c.error + '22',
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.gray,
    },
    liveDotOn: {
      backgroundColor: c.error,
    },
    liveText: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.gray,
    },
    liveTextOn: {
      color: c.error,
    },
    playerName: {
      ...FONTS.bold,
      fontSize: SIZES.xl,
      color: c.text,
      marginTop: 6,
    },
    playerDesc: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 36,
      marginTop: 16,
    },
    controlButton: {
      padding: 8,
    },
    playButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: SIZES.padding,
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: SIZES.radius - 4,
    },
    tabActive: {
      backgroundColor: c.primary,
    },
    tabFlag: {
      fontSize: 15,
    },
    tabText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.textLight,
    },
    tabTextActive: {
      color: c.white,
    },
    list: {
      padding: SIZES.padding,
      paddingBottom: 24,
    },
    stationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    stationRowActive: {
      borderColor: c.primary,
    },
    monogram: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    monogramActive: {
      backgroundColor: c.primary,
    },
    monogramText: {
      ...FONTS.bold,
      fontSize: SIZES.font,
      color: c.primary,
    },
    monogramTextActive: {
      color: c.white,
    },
    stationInfo: {
      flex: 1,
      marginRight: 8,
    },
    stationName: {
      ...FONTS.medium,
      fontSize: SIZES.medium,
      color: c.text,
    },
    stationNameActive: {
      color: c.primary,
    },
    stationDesc: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      marginTop: 2,
    },
    footer: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 8,
    },
  });

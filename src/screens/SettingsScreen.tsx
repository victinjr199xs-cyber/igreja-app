import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import {
  useSettings,
  useThemedStyles,
  ThemeMode,
  Settings,
  BIBLE_FONT_MAX,
  BIBLE_FONT_MIN,
} from '../context/SettingsContext';
import ChurchLogo from '../components/ChurchLogo';
import { clearYoutubeCache } from '../services/youtubeService';
import { openChurchMap, whatsappChurch } from '../services/contactService';
import { CHURCH_ADDRESS, CHURCH_INFO } from '../data/churchData';

const INSTAGRAM_URL = 'https://www.instagram.com/casadeadoracaooficial/';
const YOUTUBE_URL = 'https://www.youtube.com/@casadeadoracaoofficial';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Escuro', icon: 'moon-outline' },
];

const NOTIFICATION_OPTIONS: {
  key: keyof Pick<Settings, 'notifyDailyVerse' | 'notifyReading' | 'notifyServices'>;
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'notifyDailyVerse', title: 'Versículo do dia', detail: 'Todos os dias às 7h', icon: 'sparkles-outline' },
  { key: 'notifyReading', title: 'Lembrete de leitura', detail: 'Todos os dias às 19h', icon: 'book-outline' },
  { key: 'notifyServices', title: 'Lembrete dos cultos', detail: '1 hora antes de cada culto', icon: 'people-outline' },
];

export default function SettingsScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { settings, update } = useSettings();
  const [permission, setPermission] = useState<string | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((p) => setPermission(p.status))
      .catch(() => {});
  }, []);

  const toggleNotification = async (key: (typeof NOTIFICATION_OPTIONS)[number]['key'], value: boolean) => {
    update({ [key]: value });
    // Ligar um lembrete sem permissão não teria efeito: pede na hora.
    if (value && permission !== 'granted') {
      const res = await Notifications.requestPermissionsAsync().catch(() => null);
      if (res) setPermission(res.status);
      if (res && res.status !== 'granted') {
        Alert.alert(
          'Notificações desativadas',
          'Para receber os lembretes, permita as notificações do app nos ajustes do celular.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  };

  const clearCache = () => {
    Alert.alert(
      'Limpar dados salvos?',
      'As listas de pregações serão baixadas de novo, e o "continuar assistindo" e o "continuar lendo" serão apagados. Suas preferências são mantidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await clearYoutubeCache(true).catch(() => {});
            await AsyncStorage.removeItem('bible:last').catch(() => {});
            Alert.alert('Pronto', 'Os dados salvos foram apagados.');
          },
        },
      ]
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>APARÊNCIA</Text>
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map((opt) => {
          const active = settings.themeMode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.themeOption, active && styles.themeOptionActive]}
              onPress={() => update({ themeMode: opt.mode })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={opt.icon} size={26} color={active ? colors.white : colors.primary} />
              <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>
        No automático, o app acompanha o modo claro/escuro do celular.
      </Text>

      <Text style={styles.sectionTitle}>LEITURA DA BÍBLIA</Text>
      <View style={styles.card}>
        <Text style={styles.rowTitle}>Tamanho do texto</Text>
        <View style={styles.fontRow}>
          <TouchableOpacity
            style={styles.fontStep}
            disabled={settings.bibleFontSize <= BIBLE_FONT_MIN}
            onPress={() =>
              update({ bibleFontSize: Math.max(BIBLE_FONT_MIN, settings.bibleFontSize - 2) })
            }
          >
            <Text style={[styles.fontStepText, { fontSize: 14 }]}>A−</Text>
          </TouchableOpacity>
          <Text style={styles.fontValue}>{settings.bibleFontSize} pt</Text>
          <TouchableOpacity
            style={styles.fontStep}
            disabled={settings.bibleFontSize >= BIBLE_FONT_MAX}
            onPress={() =>
              update({ bibleFontSize: Math.min(BIBLE_FONT_MAX, settings.bibleFontSize + 2) })
            }
          >
            <Text style={[styles.fontStepText, { fontSize: 20 }]}>A+</Text>
          </TouchableOpacity>
        </View>
        <Text
          style={[
            styles.preview,
            { fontSize: settings.bibleFontSize, lineHeight: Math.round(settings.bibleFontSize * 1.7) },
          ]}
        >
          <Text style={styles.previewNum}>1 </Text>
          No princípio criou Deus os céus e a terra.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>NOTIFICAÇÕES</Text>
      <View style={styles.card}>
        {NOTIFICATION_OPTIONS.map((opt, i) => (
          <View key={opt.key} style={[styles.row, i > 0 && styles.rowDivider]}>
            <Ionicons name={opt.icon} size={22} color={colors.primary} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{opt.title}</Text>
              <Text style={styles.rowDetail}>{opt.detail}</Text>
            </View>
            <Switch
              value={settings[opt.key]}
              onValueChange={(v) => toggleNotification(opt.key, v)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        ))}
      </View>
      {permission !== null && permission !== 'granted' && (
        <TouchableOpacity onPress={() => Linking.openSettings()}>
          <Text style={[styles.hint, styles.warning]}>
            As notificações estão bloqueadas no celular. Toque para abrir os ajustes.
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>DADOS</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={clearCache}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.error }]}>Limpar dados salvos</Text>
            <Text style={styles.rowDetail}>Pregações em cache e histórico de leitura</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>SOBRE</Text>
      <View style={styles.card}>
        <View style={styles.about}>
          <ChurchLogo size="large" align="center" />
        </View>
        <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={() => Linking.openURL(INSTAGRAM_URL)}>
          <Ionicons name="logo-instagram" size={22} color={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Instagram</Text>
            <Text style={styles.rowDetail}>@casadeadoracaooficial</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={() => Linking.openURL(YOUTUBE_URL)}>
          <Ionicons name="logo-youtube" size={22} color={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>YouTube</Text>
            <Text style={styles.rowDetail}>Casa de Adoração Official</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={openChurchMap}>
          <Ionicons name="location-outline" size={22} color={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Endereço</Text>
            <Text style={styles.rowDetail}>{CHURCH_ADDRESS}</Text>
          </View>
          <Ionicons name="navigate-outline" size={18} color={colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={whatsappChurch}>
          <Ionicons name="logo-whatsapp" size={22} color={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Contato</Text>
            <Text style={styles.rowDetail}>{CHURCH_INFO.phoneDisplay} · WhatsApp</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.gray} />
        </TouchableOpacity>
        <View style={[styles.row, styles.rowDivider]}>
          <Ionicons name="book-outline" size={22} color={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Tradução bíblica</Text>
            <Text style={styles.rowDetail}>Bíblia Livre · domínio público</Text>
          </View>
        </View>
        <View style={[styles.row, styles.rowDivider]}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Versão do app</Text>
            <Text style={styles.rowDetail}>{version}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: SIZES.padding,
      paddingBottom: 48,
    },
    sectionTitle: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      letterSpacing: 1,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
    },
    hint: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 8,
      marginHorizontal: 4,
    },
    warning: {
      color: c.error,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      borderRadius: SIZES.radius,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      gap: 6,
    },
    themeOptionActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    themeLabel: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
    },
    themeLabelActive: {
      color: c.white,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      padding: SIZES.padding,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 6,
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: 8,
      paddingTop: 14,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      ...FONTS.medium,
      fontSize: SIZES.medium,
      color: c.text,
    },
    rowDetail: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    fontRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      marginVertical: 12,
    },
    fontStep: {
      width: 56,
      height: 40,
      borderRadius: 8,
      backgroundColor: c.lightGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fontStepText: {
      ...FONTS.bold,
      color: c.text,
    },
    fontValue: {
      ...FONTS.mono,
      fontSize: SIZES.font,
      color: c.textLight,
      minWidth: 48,
      textAlign: 'center',
    },
    preview: {
      ...FONTS.regular,
      color: c.text,
      backgroundColor: c.background,
      borderRadius: 8,
      padding: 12,
    },
    previewNum: {
      ...FONTS.bold,
      color: c.primary,
    },
    about: {
      paddingVertical: 8,
    },
  });

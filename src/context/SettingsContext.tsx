import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK, LIGHT, Palette } from '../constants/theme';
import { scheduleNotifications } from '../services/notificationService';
import { reportError } from '../services/errorReporter';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  /** Tamanho do texto no leitor da Bíblia, em pontos. */
  bibleFontSize: number;
  notifyDailyVerse: boolean;
  notifyReading: boolean;
  notifyServices: boolean;
}

export const BIBLE_FONT_MIN = 14;
export const BIBLE_FONT_MAX = 28;

const DEFAULTS: Settings = {
  themeMode: 'system',
  bibleFontSize: 18,
  notifyDailyVerse: true,
  notifyReading: true,
  notifyServices: true,
};

const STORAGE_KEY = 'settings:v1';

interface ContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  loaded: boolean;
  colors: Palette;
  isDark: boolean;
}

const SettingsContext = createContext<ContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        // Mescla com os padrões: uma versão nova do app pode ter chaves que a
        // gravação antiga não tem.
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  // Reagenda sempre que uma preferência de notificação muda — e na abertura,
  // já com as preferências gravadas.
  const { notifyDailyVerse, notifyReading, notifyServices } = settings;
  useEffect(() => {
    if (!loaded) return;
    scheduleNotifications({ notifyDailyVerse, notifyReading, notifyServices }).catch((e) =>
      reportError('notifications-schedule', e)
    );
  }, [loaded, notifyDailyVerse, notifyReading, notifyServices]);

  const isDark =
    settings.themeMode === 'dark' || (settings.themeMode === 'system' && systemScheme === 'dark');

  const value = useMemo(
    () => ({ settings, update, loaded, colors: isDark ? DARK : LIGHT, isDark }),
    [settings, loaded, isDark]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings precisa estar dentro de <SettingsProvider>');
  return ctx;
}

export function useTheme() {
  const { colors, isDark } = useSettings();
  return { colors, isDark };
}

/**
 * Estilos que dependem do tema: recriados só quando a paleta muda.
 *   const makeStyles = (c: Palette) => StyleSheet.create({ ... });
 *   const { styles, colors } = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T>(factory: (c: Palette) => T) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => factory(colors), [factory, colors]);
  return { styles, colors, isDark };
}

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Importa peso a peso: o índice do pacote puxaria todos os 18 pesos (~8 MB)
// para dentro do app.
import { FiraSans_400Regular } from '@expo-google-fonts/fira-sans/400Regular';
import { FiraSans_500Medium } from '@expo-google-fonts/fira-sans/500Medium';
import { FiraSans_700Bold } from '@expo-google-fonts/fira-sans/700Bold';
import { FiraMono_400Regular } from '@expo-google-fonts/fira-mono/400Regular';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotificationsAsync,
  scheduleDailyVerseNotification,
} from './src/services/notificationService';

// Segura a splash até as fontes da identidade carregarem, para a logo não
// aparecer um instante na fonte do sistema.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    FiraSans_400Regular,
    FiraSans_500Medium,
    FiraSans_700Bold,
    FiraMono_400Regular,
  });
  // Se as fontes falharem, segue com a do sistema em vez de travar na splash.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    setupNotifications();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const setupNotifications = async () => {
    // O agendamento local não depende do token de push: uma falha ao
    // registrar não pode impedir o versículo diário de ser agendado.
    try {
      await registerForPushNotificationsAsync();
    } catch (error) {
      console.warn('Registro de push falhou:', error);
    }

    try {
      await scheduleDailyVerseNotification();
    } catch (error) {
      console.warn('Agendamento de notificações falhou:', error);
    }
  };

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

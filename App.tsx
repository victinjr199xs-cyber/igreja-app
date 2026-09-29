import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
// Importa peso a peso: o índice do pacote puxaria todos os 18 pesos (~8 MB)
// para dentro do app.
import { FiraSans_400Regular } from '@expo-google-fonts/fira-sans/400Regular';
import { FiraSans_500Medium } from '@expo-google-fonts/fira-sans/500Medium';
import { FiraSans_700Bold } from '@expo-google-fonts/fira-sans/700Bold';
import { FiraMono_400Regular } from '@expo-google-fonts/fira-mono/400Regular';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { registerForPushNotificationsAsync } from './src/services/notificationService';

// Segura a splash até as fontes e as preferências carregarem: sem isso a logo
// piscaria na fonte do sistema, e o tema escuro, no claro.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { loaded, isDark } = useSettings();
  const [fontsLoaded, fontError] = useFonts({
    FiraSans_400Regular,
    FiraSans_500Medium,
    FiraSans_700Bold,
    FiraMono_400Regular,
  });
  // Se as fontes falharem, segue com a do sistema em vez de travar na splash.
  const ready = loaded && (fontsLoaded || !!fontError);

  useEffect(() => {
    // Só pede a permissão; o agendamento fica com o SettingsProvider, que
    // conhece as preferências.
    registerForPushNotificationsAsync().catch((e) => console.warn('Registro de push falhou:', e));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  // O gesto de voltar da tela de Configurações (stack) usa o gesture-handler.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <Root />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import React, { useEffect } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  ParamListBase,
  createNavigationContainerRef,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { targetForNotification } from './notificationRoute';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../constants/theme';
import { useTheme } from '../context/SettingsContext';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SermonsScreen from '../screens/SermonsScreen';
import RadioScreen from '../screens/RadioScreen';
import BibleScreen from '../screens/BibleScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrayerScreen from '../screens/PrayerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import GiveScreen, { GIVING_ENABLED } from '../screens/GiveScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Navegar de fora das telas (toque numa notificação).
const navigationRef = createNavigationContainerRef<ParamListBase>();

/** Abre a aba certa para o toque numa notificação (só o toque simples). */
function openFromNotification(response: Notifications.NotificationResponse | null) {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const target = targetForNotification(response.notification.request.content.data);
  if (!target || !navigationRef.isReady()) return;
  // 'Abas' fecha o que estiver por cima (Configurações, Perfil...) e vai à aba.
  navigationRef.navigate('Abas', {
    screen: target.tab,
    params: 'params' in target ? target.params : undefined,
  });
}

/** Esquece o toque já tratado, para não reabrir a mesma tela no próximo login. */
const forgetLastTap = () => Notifications.clearLastNotificationResponseAsync().catch(() => {});

const getIconName = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Início':
      return focused ? 'home' : 'home-outline';
    case 'Calendário':
      return focused ? 'calendar' : 'calendar-outline';
    case 'Pregações':
      return focused ? 'play-circle' : 'play-circle-outline';
    case 'Rádio':
      return focused ? 'radio' : 'radio-outline';
    case 'Bíblia':
      return focused ? 'book' : 'book-outline';
    default:
      return 'ellipse';
  }
};

function Tabs() {
  const { colors, isDark } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getIconName(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: isDark ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          ...FONTS.medium,
          fontSize: 11,
        },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Calendário" component={CalendarScreen} />
      <Tab.Screen name="Pregações" component={SermonsScreen} />
      <Tab.Screen name="Rádio" component={RadioScreen} />
      <Tab.Screen name="Bíblia" component={BibleScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  const stackOptions = {
    headerTintColor: colors.primary,
    headerTitleStyle: { ...FONTS.bold, color: colors.text },
    headerBackTitle: 'Voltar',
  };

  // Toque com o app aberto (ou em segundo plano).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response);
      forgetLastTap();
    });
    return () => sub.remove();
  }, []);

  // Toque que abriu o app fechado: a navegação só aceita ordens depois de pronta.
  const handleColdStartTap = () => {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        openFromNotification(response);
        if (response) forgetLastTap();
      })
      .catch(() => {});
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={handleColdStartTap}>
      <Stack.Navigator>
        <Stack.Screen name="Abas" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Configurações" component={SettingsScreen} options={stackOptions} />
        <Stack.Screen name="Meu perfil" component={ProfileScreen} options={stackOptions} />
        <Stack.Screen name="Avaliar o app" component={FeedbackScreen} options={stackOptions} />
        <Stack.Screen name="Pedido de oração" component={PrayerScreen} options={stackOptions} />
        {GIVING_ENABLED && (
          <Stack.Screen name="Dízimos e ofertas" component={GiveScreen} options={stackOptions} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

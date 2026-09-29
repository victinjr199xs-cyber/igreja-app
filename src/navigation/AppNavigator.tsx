import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
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
import GiveScreen, { GIVING_ENABLED } from '../screens/GiveScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator>
        <Stack.Screen name="Abas" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Configurações" component={SettingsScreen} options={stackOptions} />
        <Stack.Screen name="Meu perfil" component={ProfileScreen} options={stackOptions} />
        <Stack.Screen name="Pedido de oração" component={PrayerScreen} options={stackOptions} />
        {GIVING_ENABLED && (
          <Stack.Screen name="Dízimos e ofertas" component={GiveScreen} options={stackOptions} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import CalendarScreen from '../screens/CalendarScreen';
import SermonsScreen from '../screens/SermonsScreen';
import RadioScreen from '../screens/RadioScreen';
import BibleScreen from '../screens/BibleScreen';

const Tab = createBottomTabNavigator();

const getIconName = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
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

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = getIconName(route.name, focused);
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.secondary,
          tabBarInactiveTintColor: COLORS.gray,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            height: 70,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen name="Calendário" component={CalendarScreen} />
        <Tab.Screen name="Pregações" component={SermonsScreen} />
        <Tab.Screen name="Rádio" component={RadioScreen} />
        <Tab.Screen name="Bíblia" component={BibleScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

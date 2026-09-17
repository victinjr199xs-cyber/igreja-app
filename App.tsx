import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotificationsAsync,
  scheduleDailyVerseNotification,
} from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    await registerForPushNotificationsAsync();
    await scheduleDailyVerseNotification();
  };

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

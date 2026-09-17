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

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

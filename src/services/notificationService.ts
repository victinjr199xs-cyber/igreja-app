import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { DAILY_VERSES } from '../data/churchData';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Device.isDevice) {
    return undefined;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-verse', {
      name: 'Versículo Diário',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6F00',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return undefined;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function scheduleDailyVerseNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const today = new Date().getDay();
  const verse = DAILY_VERSES[today % DAILY_VERSES.length];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✝️ Versículo do Dia',
      body: `${verse.text} — ${verse.reference}`,
      data: { verse: verse.reference },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📖 Hora de Ler a Bíblia',
      body: 'Reserve um momento para ler a Palavra de Deus hoje.',
      data: { type: 'reading-reminder' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

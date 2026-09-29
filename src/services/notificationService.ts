import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { WEEKLY_EVENTS } from '../data/churchData';
import { verseOfDay } from '../data/dailyVerses';

// Dias de versículo agendados de uma vez (+ leitura e cultos, bem abaixo do
// limite de 64 do iOS).
const VERSE_DAYS_AHEAD = 30;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
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
      lightColor: '#823030',
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

  // O token Expo só é necessário para push remoto (enviado por um servidor).
  // As notificações locais deste app funcionam sem ele, então a ausência de
  // projectId não é um erro: apenas não há token a devolver.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    return undefined;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.warn('Não foi possível obter o token de push:', error);
    return undefined;
  }
}

export interface NotificationPrefs {
  notifyDailyVerse: boolean;
  notifyReading: boolean;
  notifyServices: boolean;
}

// Minutos de antecedência do lembrete de culto.
const SERVICE_REMINDER_MINUTES = 60;

/**
 * Cancela tudo e agenda de novo conforme as preferências. Chamado na abertura
 * do app e a cada mudança em Configurações.
 */
export async function scheduleNotifications(prefs: NotificationPrefs): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (prefs.notifyDailyVerse) {
    // Um agendamento por data, cada um com o versículo daquele dia — um DAILY
    // repetiria o mesmo texto. O iOS aceita no máximo 64 notificações
    // pendentes, então agenda só os próximos dias; como o app reagenda a cada
    // abertura, a janela vai andando junto.
    const now = new Date();
    for (let i = 0; i < VERSE_DAYS_AHEAD; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 7, 0, 0);
      if (date <= now) continue;
      const verse = verseOfDay(date);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✝️ Versículo do Dia',
          body: `${verse.text} — ${verse.reference}`,
          data: { verse: verse.reference },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }

  if (prefs.notifyReading) {
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

  if (prefs.notifyServices) {
    for (const event of WEEKLY_EVENTS) {
      const [h, m] = event.startTime.split(':').map(Number);
      const total = h * 60 + m - SERVICE_REMINDER_MINUTES;
      // Culto logo após a meia-noite empurraria o lembrete para o dia anterior.
      const day = total < 0 ? (event.day + 6) % 7 : event.day;
      const minutes = (total + 1440) % 1440;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⛪ ${event.title} em 1 hora`,
          body: `Hoje às ${event.startTime} · ${event.location}`,
          data: { type: 'service-reminder', id: event.id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1,
          hour: Math.floor(minutes / 60),
          minute: minutes % 60,
        },
      });
    }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

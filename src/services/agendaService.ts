import { Alert, Share } from 'react-native';
// A API nova do SDK 57 (addEventWithForm) exige um calendário já aberto; o
// formulário do sistema da API legacy não pede permissão de agenda: a pessoa
// só confirma o evento na tela nativa.
import * as Calendar from 'expo-calendar/legacy';
import {
  CHURCH_ADDRESS,
  CHURCH_INFO,
  ChurchEvent,
  SpecialEvent,
  WEEKLY_EVENTS,
} from '../data/churchData';

// A igreja divulga só o início; duas horas é a duração típica de um culto.
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Abre a tela nativa de "Novo evento" já preenchida. Cultos semanais entram
 * com repetição semanal; todos com alarme 1 hora antes.
 */
export async function addToPhoneCalendar(
  event: ChurchEvent | SpecialEvent,
  start: Date,
  weekly: boolean
) {
  const open = () =>
    Calendar.createEventInCalendarAsync({
      title: `${event.title} · ${CHURCH_INFO.name}`,
      startDate: start,
      endDate: new Date(start.getTime() + DEFAULT_DURATION_MS),
      location: CHURCH_ADDRESS,
      notes: event.description,
      alarms: [{ relativeOffset: -60 }],
      ...(weekly ? { recurrenceRule: { frequency: Calendar.Frequency.WEEKLY } } : {}),
    });

  try {
    await open();
  } catch {
    // Antes do iOS 17 o formulário exige a permissão de agenda já concedida.
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        await open();
        return;
      }
      Alert.alert(
        'Agenda sem permissão',
        'Permita o acesso à agenda nos ajustes do celular para adicionar os cultos.'
      );
    } catch {
      Alert.alert('Não foi possível abrir a agenda', 'Tente novamente em instantes.');
    }
  }
}

/** Convite com horários e endereço, para mandar pelo WhatsApp etc. */
export function shareInvite() {
  const times = WEEKLY_EVENTS.map((e) => `${DAY_NAMES[e.day]} às ${e.startTime.replace(':', 'h')}`)
    .join('\n• ');
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CHURCH_ADDRESS)}`;
  const message =
    `Você é meu convidado! 🙏\n\n` +
    `${CHURCH_INFO.name} — Reino de Sacerdotes\n\n` +
    `Cultos:\n• ${times}\n\n` +
    `📍 ${CHURCH_ADDRESS}\n${map}`;
  Share.share({ message }).catch(() => {});
}

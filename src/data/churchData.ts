export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  day: number;
  startTime: string;
  // Opcional: a igreja divulga só o horário de início.
  endTime?: string;
  location: string;
  type: 'culto' | 'estudo' | 'reuniao' | 'evento';
}


export const CHURCH_INFO = {
  name: 'Casa de Adoração',
  street: 'R. João Alves da Silveira',
  district: 'St. Cristina II',
  city: 'Trindade - GO',
  zip: '75389-275',
  /** Exibição: (62) 98343-3231. */
  phoneDisplay: '(62) 98343-3231',
  /** Internacional, só dígitos: para tel: e wa.me. */
  phoneE164: '5562983433231',
  instagram: 'https://www.instagram.com/casadeadoracaooficial/',
  youtube: 'https://www.youtube.com/@casadeadoracaoofficial',
  /**
   * Dízimos e ofertas. Enquanto a chave estiver vazia, a tela de ofertas fica
   * escondida. Titular e cidade aparecem no app do banco ao pagar e precisam
   * bater com o cadastro da chave.
   */
  pix: {
    key: '',
    holder: 'Casa de Adoração',
    city: 'Trindade',
  },
};

export const CHURCH_ADDRESS = `${CHURCH_INFO.street} - ${CHURCH_INFO.district}, ${CHURCH_INFO.city}, ${CHURCH_INFO.zip}`;

// Horários oficiais, do banner do canal da igreja no YouTube.
export const WEEKLY_EVENTS: ChurchEvent[] = [
  {
    id: 'culto-quarta',
    title: 'Culto de Quarta',
    description: 'Adoração e ministração da Palavra.',
    day: 3,
    startTime: '19:30',
    location: 'St. Cristina II · Trindade-GO',
    type: 'culto',
  },
  {
    id: 'culto-domingo',
    title: 'Culto de Domingo',
    description: 'Adoração e ministração da Palavra.',
    day: 0,
    startTime: '18:00',
    location: 'St. Cristina II · Trindade-GO',
    type: 'culto',
  },
];

/** Evento de data única: conferência, batismo, vigília, santa ceia... */
export interface SpecialEvent extends Omit<ChurchEvent, 'day'> {
  /** AAAA-MM-DD */
  date: string;
}

// Cadastre aqui os eventos especiais. Eles aparecem marcados no calendário da
// aba Programação e entram na contagem do "próximo culto/evento". Exemplo:
//   {
//     id: 'conferencia-2026',
//     title: 'Conferência de Adoração',
//     description: 'Três noites de louvor e Palavra.',
//     date: '2026-11-14',
//     startTime: '19:00',
//     location: 'St. Cristina II · Trindade-GO',
//     type: 'evento',
//   },
export const SPECIAL_EVENTS: SpecialEvent[] = [];

// Eventos vindos de content/igreja.json (editável no GitHub, sem publicar o
// app). Preenchidos pelo ContentProvider.
let remoteSpecialEvents: SpecialEvent[] = [];

export function setRemoteSpecialEvents(list: SpecialEvent[]) {
  remoteSpecialEvents = list;
}

/** Eventos especiais do código + os do arquivo online, sem repetir id. */
export function allSpecialEvents(): SpecialEvent[] {
  const ids = new Set(SPECIAL_EVENTS.map((e) => e.id));
  return [...SPECIAL_EVENTS, ...remoteSpecialEvents.filter((e) => !ids.has(e.id))];
}

export interface Occurrence {
  event: ChurchEvent | SpecialEvent;
  /** Dia e hora de início desta ocorrência. */
  date: Date;
  special: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Data local no formato AAAA-MM-DD (o mesmo de SPECIAL_EVENTS). */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function at(day: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Tudo o que acontece num dia, em ordem de horário. */
export function eventsOn(day: Date): Occurrence[] {
  const key = dateKey(day);
  const list: Occurrence[] = [
    ...WEEKLY_EVENTS.filter((e) => e.day === day.getDay()).map((event) => ({
      event,
      date: at(day, event.startTime),
      special: false,
    })),
    ...allSpecialEvents().filter((e) => e.date === key).map((event) => ({
      event,
      date: at(day, event.startTime),
      special: true,
    })),
  ];
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Janela em que um culto é considerado "acontecendo agora".
const LIVE_BEFORE_MIN = 10;
const LIVE_AFTER_MIN = 150;

/** O culto/evento em andamento agora (pelo horário da programação), se houver. */
export function getCurrentEvent(now = new Date()): ChurchEvent | SpecialEvent | null {
  for (const occ of eventsOn(now)) {
    const diff = (now.getTime() - occ.date.getTime()) / 60000;
    if (diff >= -LIVE_BEFORE_MIN && diff <= LIVE_AFTER_MIN) return occ.event;
  }
  return null;
}

/** O próximo culto/evento a partir de agora. */
export function getNextEvent(now = new Date()): Occurrence | null {
  for (let i = 0; i < 60; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const next = eventsOn(day).find((occ) => occ.date > now);
    if (next) return next;
  }
  return null;
}

/** Próxima data (com hora) de um culto semanal. */
export function nextDateOf(event: ChurchEvent, now = new Date()): Date {
  const date = at(now, event.startTime);
  date.setDate(now.getDate() + ((event.day - now.getDay() + 7) % 7));
  if (date <= now) date.setDate(date.getDate() + 7);
  return date;
}

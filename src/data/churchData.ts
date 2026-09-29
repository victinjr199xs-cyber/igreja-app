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

export interface BibleVerse {
  reference: string;
  text: string;
  book: string;
  chapter: number;
  verse: number;
}

// Horários oficiais, do banner do canal da igreja no YouTube.
export const WEEKLY_EVENTS: ChurchEvent[] = [
  {
    id: 'culto-quarta',
    title: 'Culto de Quarta',
    description: 'Adoração e ministração da Palavra.',
    day: 3,
    startTime: '19:30',
    location: 'Casa de Adoração · Trindade-GO',
    type: 'culto',
  },
  {
    id: 'culto-domingo',
    title: 'Culto de Domingo',
    description: 'Adoração e ministração da Palavra.',
    day: 0,
    startTime: '18:00',
    location: 'Casa de Adoração · Trindade-GO',
    type: 'culto',
  },
];

/** O próximo culto a partir de agora, com a data em que acontece. */
export function getNextEvent(now = new Date()): { event: ChurchEvent; date: Date } | null {
  let best: { event: ChurchEvent; date: Date } | null = null;
  for (const event of WEEKLY_EVENTS) {
    const [h, m] = event.startTime.split(':').map(Number);
    const date = new Date(now);
    date.setHours(h, m, 0, 0);
    date.setDate(now.getDate() + ((event.day - now.getDay() + 7) % 7));
    // Mesmo dia mas o horário já passou: vale o da semana que vem.
    if (date <= now) date.setDate(date.getDate() + 7);
    if (!best || date < best.date) best = { event, date };
  }
  return best;
}

export const DAILY_VERSES: BibleVerse[] = [
  {
    reference: 'João 3:16',
    text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    book: 'João',
    chapter: 3,
    verse: 16,
  },
  {
    reference: 'Salmos 23:1',
    text: 'O Senhor é o meu pastor; nada me faltará.',
    book: 'Salmos',
    chapter: 23,
    verse: 1,
  },
  {
    reference: 'Filipenses 4:13',
    text: 'Posso todas as coisas naquele que me fortalece.',
    book: 'Filipenses',
    chapter: 4,
    verse: 13,
  },
  {
    reference: 'Jeremias 29:11',
    text: 'Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.',
    book: 'Jeremias',
    chapter: 29,
    verse: 11,
  },
  {
    reference: 'Romanos 8:28',
    text: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.',
    book: 'Romanos',
    chapter: 8,
    verse: 28,
  },
  {
    reference: 'Isaías 40:31',
    text: 'Mas os que esperam no Senhor renovarão as forças, subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão.',
    book: 'Isaías',
    chapter: 40,
    verse: 31,
  },
  {
    reference: 'Mateus 11:28',
    text: 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.',
    book: 'Mateus',
    chapter: 11,
    verse: 28,
  },
];

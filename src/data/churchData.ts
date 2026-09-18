export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  day: number;
  startTime: string;
  endTime: string;
  location: string;
  type: 'culto' | 'estudo' | 'reuniao' | 'evento';
}

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
  description: string;
}

export interface BibleVerse {
  reference: string;
  text: string;
  book: string;
  chapter: number;
  verse: number;
}

export const WEEKLY_EVENTS: ChurchEvent[] = [
  {
    id: '1',
    title: 'Culto de Domingo',
    description: 'Culto principal com adoração e pregação da Palavra.',
    day: 0,
    startTime: '10:00',
    endTime: '12:00',
    location: 'Templo Principal',
    type: 'culto',
  },
  {
    id: '2',
    title: 'Culto de Terça',
    description: 'Culto de oração e estudo bíblico.',
    day: 2,
    startTime: '19:30',
    endTime: '21:00',
    location: 'Templo Principal',
    type: 'culto',
  },
  {
    id: '3',
    title: 'Estudo Bíblico',
    description: 'Estudo aprofundado das Escrituras.',
    day: 3,
    startTime: '19:30',
    endTime: '21:00',
    location: 'Salão de Estudos',
    type: 'estudo',
  },
  {
    id: '4',
    title: 'Reunião de Jovens',
    description: 'Encontro de jovens com louvor e palavra.',
    day: 5,
    startTime: '20:00',
    endTime: '22:00',
    location: 'Salão de Jovens',
    type: 'reuniao',
  },
  {
    id: '5',
    title: 'Culto de Sábado',
    description: 'Vigília de oração e adoração.',
    day: 6,
    startTime: '19:00',
    endTime: '22:00',
    location: 'Templo Principal',
    type: 'culto',
  },
  {
    id: '6',
    title: 'Escola Dominical',
    description: 'Aula para todas as idades antes do culto.',
    day: 0,
    startTime: '08:30',
    endTime: '09:30',
    location: 'Salas de Aula',
    type: 'estudo',
  },
];

export const SERMONS: Sermon[] = [
  {
    id: '1',
    title: 'A Graça Transformadora',
    preacher: 'Pr. João Silva',
    date: '14/09/2026',
    duration: '45:30',
    thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    description: 'Uma mensagem poderosa sobre como a graça de Deus transforma vidas.',
  },
  {
    id: '2',
    title: 'Fé Inabalável',
    preacher: 'Pr. Marcos Santos',
    date: '07/09/2026',
    duration: '38:15',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    description: 'Como manter a fé em tempos difíceis.',
  },
  {
    id: '3',
    title: 'O Poder da Oração',
    preacher: 'Pr. João Silva',
    date: '31/08/2026',
    duration: '42:00',
    thumbnail: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Descubra o poder da oração na vida do cristão.',
  },
  {
    id: '4',
    title: 'Amor ao Próximo',
    preacher: 'Pr. Marcos Santos',
    date: '24/08/2026',
    duration: '36:45',
    thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'O mandamento do amor na prática diária.',
  },
  {
    id: '5',
    title: 'Propósitos de Deus',
    preacher: 'Pr. João Silva',
    date: '17/08/2026',
    duration: '40:20',
    thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    description: 'Conhecendo os propósitos de Deus para sua vida.',
  },
  {
    id: '6',
    title: 'Vitória em Cristo',
    preacher: 'Pr. Marcos Santos',
    date: '10/08/2026',
    duration: '44:10',
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    description: 'Como viver em vitória através de Cristo.',
  },
];

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

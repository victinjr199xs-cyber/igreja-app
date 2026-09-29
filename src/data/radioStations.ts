// Streams oficiais das emissoras, todos em HTTPS (iOS e Android bloqueiam HTTP
// puro) e testados antes de entrar aqui. Para achar novos links, o diretório
// https://www.radio-browser.info ajuda; teste com um GET antes de adicionar.

export type RadioLanguage = 'pt' | 'en' | 'es';

export interface RadioStation {
  id: string;
  name: string;
  /** Frequência e/ou cidade. */
  description: string;
  url: string;
  language: RadioLanguage;
}

export const RADIO_LANGUAGES: { id: RadioLanguage; label: string; flag: string }[] = [
  { id: 'pt', label: 'Brasil', flag: '🇧🇷' },
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
];

export const RADIO_STATIONS: RadioStation[] = [
  // Brasil
  {
    id: 'vinha',
    name: 'Vinha FM',
    description: '91.9 FM · Goiânia',
    url: 'https://streaming.vinhafm.com.br/stream',
    language: 'pt',
  },
  {
    id: 'aleluia',
    name: 'Rede Aleluia',
    description: 'Goiânia',
    // Cada praça da rede tem o próprio stream; Goiânia é a mais próxima.
    url: 'https://station.azrmcsoftbroadcast.com.br/listen/radio_goiania/rd_goiania',
    language: 'pt',
  },
  {
    id: 'sara',
    name: 'Sara Brasil FM',
    description: 'Rede Sara Brasil',
    url: 'https://hts07.brascast.com:13482/live',
    language: 'pt',
  },
  {
    id: 'feliz',
    name: 'Feliz FM',
    description: 'São Paulo',
    url: 'https://cloud1.cdnseguro.com:5520/;stream.mp3',
    language: 'pt',
  },
  {
    id: 'novotempo',
    name: 'Novo Tempo',
    description: 'Rede Novo Tempo de Rádio',
    // HLS (.m3u8), que o expo-audio toca nas duas plataformas.
    url: 'https://streamradio.novotempo.com/CDN-RADIO-PT/smil:radionovotempo.smil/playlist.m3u8',
    language: 'pt',
  },
  {
    id: 'melodia',
    name: 'Melodia FM',
    description: '97.5 FM · Rio de Janeiro',
    // O redirect do StreamTheWorld escolhe um servidor disponível a cada conexão.
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/MELODIAFMAAC.aac',
    language: 'pt',
  },
  {
    id: 'super',
    name: 'Rádio Super',
    description: '100.5 FM · Belo Horizonte',
    url: 'https://servidor32.brlogic.com:8200/live',
    language: 'pt',
  },
  {
    // A Gospel FM 90.1 (SP) ficou de fora: o certificado HTTPS do servidor
    // dela é inválido e o iOS recusa a conexão.
    id: 'gospelfm',
    name: 'Gospel FM',
    description: 'Rádio online',
    url: 'https://stream3.svrdedicado.org/8070/stream',
    language: 'pt',
  },

  // English
  {
    id: 'klove',
    name: 'K-LOVE',
    description: 'Positive, encouraging · USA',
    url: 'https://maestro.emfcdn.com/stream_for/k-love/tunein',
    language: 'en',
  },
  {
    id: 'air1',
    name: 'Air1',
    description: 'Worship · USA',
    url: 'https://maestro.emfcdn.com/stream_for/air1/airable/aac',
    language: 'en',
  },
  {
    id: 'moody',
    name: 'Moody Radio',
    description: '90.1 FM WMBI · Chicago',
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/WMBIFM.mp3',
    language: 'en',
  },
  {
    id: 'premier',
    name: 'Premier Christian Radio',
    description: 'London · UK',
    url: 'https://pcr.streamguys1.com/pcrnational-96k.aac',
    language: 'en',
  },
  {
    id: 'premierpraise',
    name: 'Premier Praise',
    description: 'Worship · UK',
    url: 'https://pcr.streamguys1.com/ppraise-96k.aac',
    language: 'en',
  },
  {
    id: 'ucb1',
    name: 'UCB 1',
    description: 'United Christian Broadcasters · UK',
    url: 'https://edge-audio-w2-01.sharp-stream.com/55_ucb_1_128_mp3',
    language: 'en',
  },
  {
    id: 'spiritfm',
    name: 'Spirit FM',
    description: 'Canada',
    url: 'https://ais-sa1.streamon.fm/7155_48k.aac',
    language: 'en',
  },

  // Español
  {
    id: 'vision',
    name: 'Radio Visión Cristiana',
    description: 'Internacional · EE. UU.',
    url: 'https://livestreamcdn.net:2000/stream/RadioVisionCristianaRadio/',
    language: 'es',
  },
  {
    id: 'ondasdevida',
    name: 'Ondas de Vida',
    description: '1440 AM · Ciudad de México',
    url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/XEESTAMAAC.aac',
    language: 'es',
  },
  {
    id: 'hcjb',
    name: 'HCJB La Voz de los Andes',
    description: '89.3 FM · Quito, Ecuador',
    url: 'https://streamingecuador.net:8287/hcjb',
    language: 'es',
  },
  {
    id: 'alfayomega',
    name: 'Alfa y Omega',
    description: 'Colombia',
    url: 'https://stream.zeno.fm/ebsnme8phdovv',
    language: 'es',
  },
  {
    id: 'radioviva',
    name: 'Radio Viva',
    description: '95.3 FM · Guatemala',
    url: 'https://stream.zeno.fm/uus2ugdadkhvv',
    language: 'es',
  },
  {
    id: 'rednacional',
    name: 'Red Nacional Cristiana',
    description: '710 AM · República Dominicana',
    url: 'https://node-09.zeno.fm/03yn1w98swzuv',
    language: 'es',
  },
  {
    id: 'cristianavzla',
    name: 'Radio Cristiana Venezuela',
    description: 'Venezuela',
    url: 'https://stream.zeno.fm/r7zrx18xcfhvv',
    language: 'es',
  },
];

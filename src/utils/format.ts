// Formatação de datas, horas e durações em português, usada em todo o app.
// Funções puras (sem React Native): cobertas por src/utils/__tests__.

export const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Índice = Date.getDay() (0 = domingo). */
export const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export const pad = (n: number) => String(n).padStart(2, '0');

/** "19:30" */
export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "29/09/2026" */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "29 de setembro de 2026" */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "terça-feira, 29 de setembro" */
export const formatToday = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;

/** 3997 -> "1h 06min"; 600 -> "10 min"; 0 -> "" (ao vivo / desconhecida). */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${pad(m)}min` : `${m} min`;
}

/** 3997 -> "1:06:37"; 95 -> "1:35" (posição no vídeo). */
export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Diferença em dias de calendário (ignora a hora): amanhã = 1. */
export function daysBetween(from: Date, to: Date): number {
  const start = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((start(to) - start(from)) / 86400000);
}

/** "Hoje, às 18:00" · "Amanhã, às 19:30" · "Quarta, às 19:30" */
export function describeWhen(date: Date, now: Date): string {
  const days = daysBetween(now, date);
  const time = formatTime(date);
  if (days === 0) return `Hoje, às ${time}`;
  if (days === 1) return `Amanhã, às ${time}`;
  return `${DAYS[date.getDay()]}, às ${time}`;
}

/** "Hoje · 29 de setembro" · "Quarta · 7 de outubro" */
export function describeDay(date: Date, now: Date): string {
  const days = daysBetween(now, date);
  const label = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  if (days === 0) return `Hoje · ${label}`;
  if (days === 1) return `Amanhã · ${label}`;
  return `${DAYS[date.getDay()]} · ${label}`;
}

/** Dias, horas e minutos até a data (nunca negativo). */
export function countdown(target: Date, now: Date) {
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60000));
  return { d: Math.floor(total / 1440), h: Math.floor((total % 1440) / 60), m: total % 60 };
}

/** "faltam 2 d 4 h" · "faltam 3 h 10 min" · "faltam 25 min" */
export function timeLeft(target: Date, now: Date): string {
  const { d, h, m } = countdown(target, now);
  if (d > 0) return `faltam ${d} d ${h} h`;
  if (h > 0) return `faltam ${h} h ${m} min`;
  return `faltam ${m} min`;
}

/** Saudação pelo horário. De madrugada ainda é "boa noite". */
export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Mapa explícito em vez de String.normalize: funciona igual em qualquer motor
// de JavaScript do celular.
const ACCENTED = /[áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ]/g;
const PLAIN: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u', ç: 'c', ñ: 'n',
};

/**
 * Texto para busca: minúsculo, sem acento e sem espaços nas pontas. Quem
 * digita "joao" ou "pregacao" no celular acha "João" e "Pregação".
 */
export function foldText(s: string): string {
  return s
    .replace(ACCENTED, (ch) => PLAIN[ch.toLowerCase()] ?? ch)
    .toLowerCase()
    .trim();
}

/** "AAAA-MM-DD" -> Date local à meia-noite. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

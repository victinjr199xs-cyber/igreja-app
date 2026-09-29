import { SpecialEvent, dateKey } from '../data/churchData';

/**
 * Validação de content/igreja.json, editado à mão pela igreja no GitHub.
 * Tudo que vem de lá é desconhecido até provar o contrário: item com campo
 * obrigatório faltando é descartado em vez de derrubar a tela.
 * Sem React Native: coberto por src/services/__tests__.
 */

export interface Announcement {
  id: string;
  title: string;
  text: string;
  /** Último dia em que aparece (AAAA-MM-DD). */
  until?: string;
  link?: string;
}

export interface Content {
  announcements: Announcement[];
  events: SpecialEvent[];
}

export const EMPTY_CONTENT: Content = { announcements: [], events: [] };

const DEFAULT_LOCATION = 'St. Cristina II · Trindade-GO';

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.filter(isObject) : []);

export function parseContent(raw: unknown): Content {
  const root = isObject(raw) ? raw : {};

  const announcements: Announcement[] = list(root.avisos)
    .map((a) => ({
      id: str(a.id),
      title: str(a.titulo),
      text: str(a.texto),
      until: isDate(a.ate) ? a.ate : undefined,
      // Só links web: nada de esquemas que abram outros apps sem a pessoa saber.
      link: /^https:\/\//.test(str(a.link)) ? str(a.link) : undefined,
    }))
    .filter((a) => a.id && a.title);

  const events: SpecialEvent[] = list(root.eventos)
    .map((e) => {
      const hora = str(e.hora);
      return {
        id: str(e.id),
        title: str(e.titulo),
        description: str(e.descricao),
        date: isDate(e.data) ? e.data : '',
        startTime: /^\d{1,2}:\d{2}$/.test(hora) ? hora.padStart(5, '0') : '19:00',
        location: str(e.local) || DEFAULT_LOCATION,
        type: 'evento' as const,
      };
    })
    .filter((e) => e.id && e.title && e.date);

  return { announcements, events };
}

/** Avisos ainda dentro do prazo (o dia de "ate" inclusive). */
export function activeAnnouncements(announcements: Announcement[], today = new Date()) {
  const key = dateKey(today);
  return announcements.filter((a) => !a.until || a.until >= key);
}

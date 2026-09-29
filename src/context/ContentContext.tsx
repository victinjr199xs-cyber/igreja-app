import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpecialEvent, dateKey, setRemoteSpecialEvents } from '../data/churchData';

/**
 * Conteúdo editável sem publicar o app: content/igreja.json no GitHub.
 * Como editar: content/LEIA-ME.md.
 */
const CONTENT_URL =
  'https://raw.githubusercontent.com/victinjr199xs-cyber/igreja-app/main/content/igreja.json';
const CACHE_KEY = 'content:v1';
const TTL_MS = 30 * 60 * 1000;

export interface Announcement {
  id: string;
  title: string;
  text: string;
  /** Último dia em que aparece (AAAA-MM-DD). */
  until?: string;
  link?: string;
}

interface Content {
  announcements: Announcement[];
  events: SpecialEvent[];
}

const EMPTY: Content = { announcements: [], events: [] };

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

/**
 * O arquivo é editado à mão pela igreja: tudo é validado, e item com campo
 * obrigatório faltando é descartado em vez de derrubar a tela.
 */
function parse(raw: any): Content {
  const announcements: Announcement[] = (Array.isArray(raw?.avisos) ? raw.avisos : [])
    .map((a: any) => ({
      id: str(a?.id),
      title: str(a?.titulo),
      text: str(a?.texto),
      until: isDate(a?.ate) ? a.ate : undefined,
      link: /^https?:\/\//.test(str(a?.link)) ? str(a.link) : undefined,
    }))
    .filter((a: Announcement) => a.id && a.title);

  const events: SpecialEvent[] = (Array.isArray(raw?.eventos) ? raw.eventos : [])
    .map((e: any) => ({
      id: str(e?.id),
      title: str(e?.titulo),
      description: str(e?.descricao),
      date: isDate(e?.data) ? e.data : '',
      startTime: /^\d{1,2}:\d{2}$/.test(str(e?.hora)) ? str(e.hora).padStart(5, '0') : '19:00',
      location: str(e?.local) || 'St. Cristina II · Trindade-GO',
      type: 'evento' as const,
    }))
    .filter((e: SpecialEvent) => e.id && e.title && e.date);

  return { announcements, events };
}

const ContentContext = createContext<Content>(EMPTY);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<Content>(EMPTY);

  useEffect(() => {
    const apply = (c: Content) => {
      // Os eventos entram na lógica de datas (eventsOn, próximo culto...).
      setRemoteSpecialEvents(c.events);
      setContent(c);
    };

    const refresh = async (force: boolean) => {
      let cached: { at: number; raw: unknown } | null = null;
      try {
        const s = await AsyncStorage.getItem(CACHE_KEY);
        cached = s ? JSON.parse(s) : null;
      } catch {
        cached = null;
      }
      if (cached) apply(parse(cached.raw));
      if (!force && cached && Date.now() - cached.at < TTL_MS) return;

      try {
        const res = await fetch(CONTENT_URL, { headers: { 'Cache-Control': 'no-cache' } });
        if (!res.ok) return;
        const raw = await res.json();
        apply(parse(raw));
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), raw })).catch(() => {});
      } catch {
        // Sem rede ou JSON quebrado: segue com o que estava em cache.
      }
    };

    refresh(false);
    // Volta do segundo plano: confere de novo (respeitando o TTL).
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh(false));
    return () => sub.remove();
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useChurchContent() {
  return useContext(ContentContext);
}

/** Avisos ainda dentro do prazo. */
export function activeAnnouncements(list: Announcement[], today = new Date()) {
  const key = dateKey(today);
  return list.filter((a) => !a.until || a.until >= key);
}

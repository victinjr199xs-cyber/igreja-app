import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setRemoteSpecialEvents } from '../data/churchData';
import { Content, EMPTY_CONTENT, parseContent } from '../services/contentParser';
import { reportError } from '../services/errorReporter';

export { activeAnnouncements } from '../services/contentParser';
export type { Announcement } from '../services/contentParser';

/**
 * Conteúdo editável sem publicar o app: content/igreja.json no GitHub.
 * Como editar: content/LEIA-ME.md.
 */
const CONTENT_URL =
  'https://raw.githubusercontent.com/victinjr199xs-cyber/igreja-app/main/content/igreja.json';
const CACHE_KEY = 'content:v1';
const TTL_MS = 30 * 60 * 1000;

const ContentContext = createContext<Content>(EMPTY_CONTENT);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<Content>(EMPTY_CONTENT);

  useEffect(() => {
    const apply = (c: Content) => {
      // Os eventos entram na lógica de datas (eventsOn, próximo culto...).
      setRemoteSpecialEvents(c.events);
      setContent(c);
    };

    const refresh = async () => {
      let cached: { at: number; raw: unknown } | null = null;
      try {
        const s = await AsyncStorage.getItem(CACHE_KEY);
        cached = s ? JSON.parse(s) : null;
      } catch {
        cached = null;
      }
      if (cached) apply(parseContent(cached.raw));
      if (cached && Date.now() - cached.at < TTL_MS) return;

      let res: Response;
      try {
        res = await fetch(CONTENT_URL, { headers: { 'Cache-Control': 'no-cache' } });
      } catch {
        return; // Sem rede: segue com o cache.
      }
      if (!res.ok) return;
      try {
        const raw: unknown = await res.json();
        apply(parseContent(raw));
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), raw })).catch(() => {});
      } catch (e) {
        // Quem editou igreja.json deixou o JSON inválido: o app segue com a
        // versão anterior, e o erro fica registrado para alguém corrigir.
        reportError('content-json', e);
      }
    };

    refresh();
    // Volta do segundo plano: confere de novo (respeitando o TTL).
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useChurchContent() {
  return useContext(ContentContext);
}

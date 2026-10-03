/**
 * Avisos entre telas que ficam montadas ao mesmo tempo (as abas):
 *  - 'video-start': um vídeo começou; a rádio para, para não tocarem juntos.
 *  - 'personal-data-cleared': "Limpar dados salvos"; as abas esquecem o
 *    "continuar" que já estava na memória.
 */
export type AppEvent = 'video-start' | 'personal-data-cleared';

const listeners: Record<AppEvent, Set<() => void>> = {
  'video-start': new Set(),
  'personal-data-cleared': new Set(),
};

/** Inscreve e devolve a função que cancela (pronta para o retorno do useEffect). */
export function onAppEvent(event: AppEvent, listener: () => void): () => void {
  listeners[event].add(listener);
  return () => {
    listeners[event].delete(listener);
  };
}

export function emitAppEvent(event: AppEvent) {
  for (const listener of [...listeners[event]]) {
    try {
      listener();
    } catch {
      // Uma tela com problema não pode impedir as outras de receber o aviso.
    }
  }
}

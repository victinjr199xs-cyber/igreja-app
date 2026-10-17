// Para onde leva o toque numa notificação. Função pura (sem React Native):
// coberta por src/navigation/__tests__.

export type NotificationTarget =
  | { tab: 'Bíblia'; params?: { open: { slug: string; chapter: number } } }
  | { tab: 'Calendário' }
  | { tab: 'Início' };

/**
 * Lê o `data` que o notificationService grava em cada notificação:
 * - versículo do dia → o capítulo dele na Bíblia;
 * - lembrete de leitura → a Bíblia (com o "Continuar lendo");
 * - lembrete de culto → a Programação.
 * null = notificação desconhecida: o app só abre, onde estava.
 */
export function targetForNotification(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  switch (d.type) {
    case 'daily-verse': {
      const chapter = d.chapter;
      if (typeof d.slug === 'string' && d.slug && typeof chapter === 'number' && Number.isInteger(chapter) && chapter > 0) {
        return { tab: 'Bíblia', params: { open: { slug: d.slug, chapter } } };
      }
      return { tab: 'Bíblia' };
    }
    case 'reading-reminder':
      return { tab: 'Bíblia' };
    case 'service-reminder':
      return { tab: 'Calendário' };
  }

  // Versículos agendados antes desta versão só tinham { verse: "João 3:16" }:
  // a Início mostra o versículo do dia.
  if (typeof d.verse === 'string') return { tab: 'Início' };
  return null;
}

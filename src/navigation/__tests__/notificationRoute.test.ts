import { targetForNotification } from '../notificationRoute';

describe('toque na notificação', () => {
  it('versículo do dia abre o capítulo na Bíblia', () => {
    expect(
      targetForNotification({ type: 'daily-verse', verse: 'João 3:16', slug: 'joao', chapter: 3 })
    ).toEqual({ tab: 'Bíblia', params: { open: { slug: 'joao', chapter: 3 } } });
  });

  it('versículo com capítulo inválido abre só a Bíblia', () => {
    expect(targetForNotification({ type: 'daily-verse', slug: 'joao', chapter: 0 })).toEqual({ tab: 'Bíblia' });
    expect(targetForNotification({ type: 'daily-verse', slug: 'joao', chapter: 2.5 })).toEqual({ tab: 'Bíblia' });
    expect(targetForNotification({ type: 'daily-verse', slug: '', chapter: 3 })).toEqual({ tab: 'Bíblia' });
  });

  it('lembrete de leitura abre a Bíblia; de culto, a Programação', () => {
    expect(targetForNotification({ type: 'reading-reminder' })).toEqual({ tab: 'Bíblia' });
    expect(targetForNotification({ type: 'service-reminder', id: 'culto-quarta' })).toEqual({ tab: 'Calendário' });
  });

  it('versículo agendado na versão antiga (só a referência) abre a Início', () => {
    expect(targetForNotification({ verse: 'Salmos 23:1' })).toEqual({ tab: 'Início' });
  });

  it('notificação desconhecida ou vazia não navega', () => {
    expect(targetForNotification(undefined)).toBeNull();
    expect(targetForNotification(null)).toBeNull();
    expect(targetForNotification('texto')).toBeNull();
    expect(targetForNotification({ type: 'outra-coisa' })).toBeNull();
  });
});

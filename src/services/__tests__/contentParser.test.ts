import { activeAnnouncements, parseContent } from '../contentParser';

describe('arquivo de avisos e eventos (content/igreja.json)', () => {
  it('lê avisos e eventos válidos', () => {
    const c = parseContent({
      avisos: [{ id: 'a', titulo: ' Campanha ', texto: 'Traga 1 kg', ate: '2026-11-15', link: 'https://x.com' }],
      eventos: [{ id: 'e', titulo: 'Conferência', data: '2026-11-14', hora: '9:00' }],
    });
    expect(c.announcements).toEqual([
      { id: 'a', title: 'Campanha', text: 'Traga 1 kg', until: '2026-11-15', link: 'https://x.com' },
    ]);
    expect(c.events[0]).toMatchObject({ id: 'e', title: 'Conferência', date: '2026-11-14', startTime: '09:00' });
  });

  it('usa valores padrão para hora e local ausentes', () => {
    const [e] = parseContent({ eventos: [{ id: 'e', titulo: 'T', data: '2026-11-14' }] }).events;
    expect(e.startTime).toBe('19:00');
    expect(e.location).toContain('Trindade');
  });

  it('descarta itens sem campos obrigatórios', () => {
    const c = parseContent({
      avisos: [{ titulo: 'sem id' }, { id: 'x' }, null, 'texto solto', 42],
      eventos: [{ id: 'e', titulo: 'sem data' }, { id: 'e2', titulo: 'data errada', data: '14/11/2026' }],
    });
    expect(c.announcements).toHaveLength(0);
    expect(c.events).toHaveLength(0);
  });

  it('ignora links que não são https', () => {
    const [a] = parseContent({ avisos: [{ id: 'a', titulo: 'T', link: 'javascript:alert(1)' }] }).announcements;
    expect(a.link).toBeUndefined();
    const [b] = parseContent({ avisos: [{ id: 'b', titulo: 'T', link: 'http://inseguro.com' }] }).announcements;
    expect(b.link).toBeUndefined();
  });

  it('aguenta qualquer lixo sem quebrar', () => {
    for (const raw of [null, undefined, 'x', 1, [], { avisos: 'x', eventos: {} }]) {
      expect(parseContent(raw)).toEqual({ announcements: [], events: [] });
    }
  });
});

describe('avisos dentro do prazo', () => {
  const list = [
    { id: 'sempre', title: 'T', text: '' },
    { id: 'ate-hoje', title: 'T', text: '', until: '2026-09-29' },
    { id: 'vencido', title: 'T', text: '', until: '2026-09-28' },
  ];

  it('mostra até o último dia, inclusive', () => {
    const ids = activeAnnouncements(list, new Date(2026, 8, 29, 23, 0)).map((a) => a.id);
    expect(ids).toEqual(['sempre', 'ate-hoje']);
  });
});

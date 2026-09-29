import {
  WEEKLY_EVENTS,
  allSpecialEvents,
  dateKey,
  eventsOn,
  getCurrentEvent,
  getNextEvent,
  nextDateOf,
  setRemoteSpecialEvents,
  SpecialEvent,
} from '../churchData';

// Programação oficial: quarta 19:30 e domingo 18:00. 30/09/2026 é quarta.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

const special = (over: Partial<SpecialEvent> = {}): SpecialEvent => ({
  id: 'conferencia',
  title: 'Conferência',
  description: '',
  date: '2026-10-03',
  startTime: '19:00',
  location: 'Trindade',
  type: 'evento',
  ...over,
});

afterEach(() => setRemoteSpecialEvents([]));

describe('programação semanal', () => {
  it('tem os cultos oficiais', () => {
    expect(WEEKLY_EVENTS.map((e) => [e.day, e.startTime])).toEqual([
      [3, '19:30'],
      [0, '18:00'],
    ]);
  });

  it('lista o que acontece em cada dia', () => {
    expect(eventsOn(at(2026, 9, 30)).map((o) => o.event.title)).toEqual(['Culto de Quarta']);
    expect(eventsOn(at(2026, 9, 28))).toHaveLength(0);
  });

  it('calcula a hora da ocorrência', () => {
    const [occ] = eventsOn(at(2026, 10, 4));
    expect(occ.date).toEqual(at(2026, 10, 4, 18, 0));
  });
});

describe('próximo culto', () => {
  it('é o de hoje se ainda não começou', () => {
    expect(getNextEvent(at(2026, 9, 30, 18, 0))?.date).toEqual(at(2026, 9, 30, 19, 30));
  });

  it('pula para o próximo quando o de hoje já começou', () => {
    const next = getNextEvent(at(2026, 9, 30, 20, 0));
    expect(next?.event.title).toBe('Culto de Domingo');
    expect(next?.date).toEqual(at(2026, 10, 4, 18, 0));
  });

  it('atravessa o fim de semana', () => {
    expect(getNextEvent(at(2026, 10, 4, 22, 0))?.date).toEqual(at(2026, 10, 7, 19, 30));
  });

  it('dá a próxima data de um culto semanal', () => {
    expect(nextDateOf(WEEKLY_EVENTS[0], at(2026, 9, 30, 20, 0))).toEqual(at(2026, 10, 7, 19, 30));
    expect(nextDateOf(WEEKLY_EVENTS[0], at(2026, 9, 30, 10, 0))).toEqual(at(2026, 9, 30, 19, 30));
  });
});

describe('culto acontecendo agora', () => {
  it('começa 10 minutos antes', () => {
    expect(getCurrentEvent(at(2026, 10, 4, 17, 50))?.title).toBe('Culto de Domingo');
    expect(getCurrentEvent(at(2026, 10, 4, 17, 49))).toBeNull();
  });

  it('dura 2h30 depois do início', () => {
    expect(getCurrentEvent(at(2026, 10, 4, 20, 30))?.title).toBe('Culto de Domingo');
    expect(getCurrentEvent(at(2026, 10, 4, 20, 31))).toBeNull();
  });
});

describe('eventos especiais do arquivo online', () => {
  it('entram no dia certo e na contagem do próximo', () => {
    setRemoteSpecialEvents([special()]);
    expect(eventsOn(at(2026, 10, 3)).map((o) => o.special)).toEqual([true]);
    // Sábado 03/10 às 19h vem antes do domingo 04/10.
    expect(getNextEvent(at(2026, 10, 1, 21, 0))?.event.title).toBe('Conferência');
  });

  it('ordena por horário no mesmo dia', () => {
    setRemoteSpecialEvents([special({ date: '2026-10-04', startTime: '09:00' })]);
    expect(eventsOn(at(2026, 10, 4)).map((o) => o.event.startTime)).toEqual(['09:00', '18:00']);
  });

  it('não repete evento com o mesmo id (erro de digitação no arquivo)', () => {
    setRemoteSpecialEvents([special(), special({ title: 'Cópia' })]);
    expect(allSpecialEvents().filter((e) => e.id === 'conferencia')).toHaveLength(1);
    expect(eventsOn(at(2026, 10, 3))).toHaveLength(1);
  });
});

it('formata a chave de data com zero à esquerda', () => {
  expect(dateKey(at(2026, 1, 5))).toBe('2026-01-05');
});

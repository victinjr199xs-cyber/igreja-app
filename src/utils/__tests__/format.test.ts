import {
  countdown,
  daysBetween,
  describeDay,
  describeWhen,
  formatClock,
  formatDuration,
  formatLongDate,
  formatShortDate,
  formatToday,
  greeting,
  parseDateKey,
  timeLeft,
} from '../format';

// 29/09/2026 é uma terça-feira.
const TUE = new Date(2026, 8, 29, 10, 0);

describe('durações e posições de vídeo', () => {
  it('formata duração em horas e minutos', () => {
    expect(formatDuration(3997)).toBe('1h 06min');
    expect(formatDuration(600)).toBe('10 min');
  });

  it('não mostra duração de live em andamento (0)', () => {
    expect(formatDuration(0)).toBe('');
  });

  it('formata a posição como relógio', () => {
    expect(formatClock(3997)).toBe('1:06:37');
    expect(formatClock(95)).toBe('1:35');
    expect(formatClock(5)).toBe('0:05');
  });
});

describe('datas', () => {
  it('formata datas curtas e longas', () => {
    expect(formatShortDate('2026-09-06T10:00:00')).toBe('06/09/2026');
    expect(formatLongDate('2026-09-06T10:00:00')).toBe('6 de setembro de 2026');
  });

  it('descreve o dia de hoje por extenso', () => {
    expect(formatToday(TUE)).toBe('terça-feira, 29 de setembro');
  });

  it('conta dias de calendário, ignorando a hora', () => {
    expect(daysBetween(new Date(2026, 8, 29, 23, 59), new Date(2026, 8, 30, 0, 1))).toBe(1);
    expect(daysBetween(TUE, TUE)).toBe(0);
  });

  it('atravessa a virada do mês e do ano', () => {
    expect(daysBetween(new Date(2026, 11, 31), new Date(2027, 0, 1))).toBe(1);
  });

  it('converte AAAA-MM-DD em data local', () => {
    const d = parseDateKey('2026-11-14');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 14, 0]);
  });
});

describe('quando é o próximo culto', () => {
  it('usa hoje e amanhã quando cabe', () => {
    expect(describeWhen(new Date(2026, 8, 29, 18, 0), TUE)).toBe('Hoje, às 18:00');
    expect(describeWhen(new Date(2026, 8, 30, 19, 30), TUE)).toBe('Amanhã, às 19:30');
  });

  it('usa o dia da semana quando é mais longe', () => {
    expect(describeWhen(new Date(2026, 9, 4, 18, 0), TUE)).toBe('Domingo, às 18:00');
  });

  it('descreve o dia no calendário', () => {
    expect(describeDay(new Date(2026, 8, 30), TUE)).toBe('Amanhã · 30 de setembro');
    expect(describeDay(new Date(2026, 9, 7), TUE)).toBe('Quarta · 7 de outubro');
  });

  it('faz a contagem regressiva e nunca fica negativa', () => {
    expect(countdown(new Date(2026, 8, 30, 12, 30), TUE)).toEqual({ d: 1, h: 2, m: 30 });
    expect(countdown(new Date(2026, 8, 28), TUE)).toEqual({ d: 0, h: 0, m: 0 });
  });

  it('resume o tempo que falta', () => {
    expect(timeLeft(new Date(2026, 9, 1, 14, 0), TUE)).toBe('faltam 2 d 4 h');
    expect(timeLeft(new Date(2026, 8, 29, 13, 10), TUE)).toBe('faltam 3 h 10 min');
    expect(timeLeft(new Date(2026, 8, 29, 10, 25), TUE)).toBe('faltam 25 min');
  });
});

describe('saudação', () => {
  it.each([
    [3, 'Boa noite'],
    [5, 'Bom dia'],
    [11, 'Bom dia'],
    [12, 'Boa tarde'],
    [17, 'Boa tarde'],
    [18, 'Boa noite'],
  ])('às %ih diz "%s"', (hour, expected) => {
    expect(greeting(new Date(2026, 8, 29, hour))).toBe(expected);
  });
});

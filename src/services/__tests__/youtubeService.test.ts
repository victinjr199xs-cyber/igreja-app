import {
  Video,
  WatchHistory,
  inProgress,
  isFinished,
  parseDuration,
  recordWatch,
  resumePoint,
} from '../youtubeService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// O relator grava no Supabase; aqui só interessa a lógica.
jest.mock('../errorReporter', () => ({ reportError: jest.fn() }));

const video = (id: string, durationSeconds = 3600): Video => ({
  id,
  title: `Culto ${id}`,
  publishedAt: '2026-09-27T21:00:00Z',
  durationSeconds,
});

describe('duração do YouTube (ISO 8601)', () => {
  it.each([
    ['PT1H6M37S', 3997],
    ['PT45M', 2700],
    ['PT59S', 59],
    ['P1DT2H', 93600], // dias vêm antes do "T"
    ['P0D', 0], // live em andamento
    ['lixo', 0],
  ])('%s = %i segundos', (iso, seconds) => {
    expect(parseDuration(iso)).toBe(seconds);
  });
});

describe('histórico de reprodução', () => {
  it('lista só vídeos começados e não terminados, do mais recente', () => {
    let h: WatchHistory = {};
    h = recordWatch(h, video('a'), 600, false);
    h = recordWatch(h, video('b'), 3600, true); // terminado
    h = recordWatch(h, video('c'), 10, false); // mal começou
    h = recordWatch(h, video('d'), 900, false);
    expect(inProgress(h).map((e) => e.video.id)).toEqual(['d', 'a']);
  });

  it('guarda o segundo inteiro', () => {
    const h = recordWatch({}, video('a'), 123.9, false);
    expect(h.a.seconds).toBe(123);
  });

  it('não altera o histórico recebido', () => {
    const before: WatchHistory = {};
    recordWatch(before, video('a'), 600, false);
    expect(before).toEqual({});
  });

  it('mantém no máximo 60 vídeos, descartando os mais antigos', () => {
    let h: WatchHistory = {};
    const now = jest.spyOn(Date, 'now');
    for (let i = 0; i < 65; i++) {
      now.mockReturnValue(1_000_000 + i);
      h = recordWatch(h, video(`v${i}`), 600, false);
    }
    now.mockRestore();
    expect(Object.keys(h)).toHaveLength(60);
    expect(h.v0).toBeUndefined();
    expect(h.v64).toBeDefined();
  });
});

describe('retomar e terminar', () => {
  it('retoma de onde parou; terminado ou nunca visto começa do zero', () => {
    let h: WatchHistory = {};
    h = recordWatch(h, video('a'), 1500, false);
    h = recordWatch(h, video('b'), 3600, true);
    expect(resumePoint(h, video('a'))).toBe(1500);
    expect(resumePoint(h, video('b'))).toBe(0);
    expect(resumePoint(h, video('c'))).toBe(0);
  });

  it('o último minuto (créditos) conta como terminado', () => {
    expect(isFinished(video('a', 3600), 3545)).toBe(true);
    expect(isFinished(video('a', 3600), 3500)).toBe(false);
    // Duração desconhecida (live): nunca dá como terminado.
    expect(isFinished(video('a', 0), 99999)).toBe(false);
  });
});

import { emitAppEvent, onAppEvent } from '../appEvents';

describe('avisos entre telas', () => {
  it('entrega o aviso a quem se inscreveu, e só àquele evento', () => {
    const radio = jest.fn();
    const sermons = jest.fn();
    const offRadio = onAppEvent('video-start', radio);
    const offSermons = onAppEvent('personal-data-cleared', sermons);

    emitAppEvent('video-start');
    expect(radio).toHaveBeenCalledTimes(1);
    expect(sermons).not.toHaveBeenCalled();

    offRadio();
    offSermons();
  });

  it('para de entregar depois de cancelado (tela desmontada)', () => {
    const listener = jest.fn();
    const off = onAppEvent('video-start', listener);
    off();
    emitAppEvent('video-start');
    expect(listener).not.toHaveBeenCalled();
  });

  it('uma tela com erro não impede as outras de receber', () => {
    const broken = jest.fn(() => {
      throw new Error('falhou');
    });
    const ok = jest.fn();
    const off1 = onAppEvent('personal-data-cleared', broken);
    const off2 = onAppEvent('personal-data-cleared', ok);
    expect(() => emitAppEvent('personal-data-cleared')).not.toThrow();
    expect(ok).toHaveBeenCalledTimes(1);
    off1();
    off2();
  });
});

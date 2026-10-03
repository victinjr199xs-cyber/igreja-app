jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: () => 'casadeadoracao://auth-callback' }));
jest.mock('expo-apple-authentication', () => ({}));
jest.mock('../supabase', () => ({
  supabase: {},
  SUPABASE_URL: 'https://projeto.supabase.co',
  SUPABASE_PUBLIC_KEY: 'sb_publishable_teste',
}));

import { assertProviderReady } from '../socialAuth';

const reply = (status: number, body: unknown) =>
  Promise.resolve({ status, json: () => Promise.resolve(body) } as Response);

describe('conferência do provedor antes de abrir o navegador', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('configurado (o Supabase manda para o Google): segue', async () => {
    globalThis.fetch = jest.fn(() => reply(200, null));
    await expect(assertProviderReady('google')).resolves.toBeUndefined();
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://projeto.supabase.co/auth/v1/authorize?provider=google'
    );
  });

  it('faltando a chave secreta: devolve a mensagem do Supabase para a tela traduzir', async () => {
    globalThis.fetch = jest.fn(() =>
      reply(400, { code: 400, error_code: 'validation_failed', msg: 'Unsupported provider: missing OAuth secret' })
    );
    await expect(assertProviderReady('google')).rejects.toThrow('Unsupported provider: missing OAuth secret');
  });

  it('sem internet: não atrapalha (o navegador mostra o próprio erro)', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
    await expect(assertProviderReady('google')).resolves.toBeUndefined();
  });

  it('erro do servidor do Supabase (5xx): também não bloqueia', async () => {
    globalThis.fetch = jest.fn(() => reply(503, null));
    await expect(assertProviderReady('google')).resolves.toBeUndefined();
  });
});

import { createEncryptedStorage, KeyValue } from '../encryptedStorage';

function memory(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

let seed = 1;
const randomBytes = (n: number) => Uint8Array.from({ length: n }, () => (seed = (seed * 97 + 13) % 256));

function setup() {
  const secure = memory();
  const plain = memory();
  return { secure, plain, store: createEncryptedStorage({ secure, plain, randomBytes }) };
}

const SESSION = JSON.stringify({ access_token: 'eyJ.segredo', user: { email: 'ana@exemplo.com', nome: 'Ana Júlia ✨' } });

describe('createEncryptedStorage', () => {
  it('grava cifrado e lê de volta igual', async () => {
    const { store, plain, secure } = setup();
    await store.setItem('sb-auth', SESSION);
    const raw = plain.data.get('sb-auth')!;
    expect(raw.startsWith('enc1:')).toBe(true);
    expect(raw).not.toContain('segredo');
    expect(raw).not.toContain('ana@exemplo.com');
    expect(secure.data.get('sb-auth')).toHaveLength(64);
    expect(await store.getItem('sb-auth')).toBe(SESSION);
  });

  it('chave nova a cada gravação', async () => {
    const { store, secure } = setup();
    await store.setItem('k', 'a');
    const first = secure.data.get('k');
    await store.setItem('k', 'a');
    expect(secure.data.get('k')).not.toBe(first);
  });

  it('lê sessão antiga em texto puro (ninguém é deslogado)', async () => {
    const { store, plain } = setup();
    plain.data.set('sb-auth', SESSION);
    expect(await store.getItem('sb-auth')).toBe(SESSION);
  });

  it('sem a chave do cofre não lê nada', async () => {
    const { store, secure } = setup();
    await store.setItem('sb-auth', SESSION);
    secure.data.clear();
    expect(await store.getItem('sb-auth')).toBeNull();
  });

  it('remove dos dois lugares', async () => {
    const { store, plain, secure } = setup();
    await store.setItem('k', 'v');
    await store.removeItem('k');
    expect(plain.data.size + secure.data.size).toBe(0);
    expect(await store.getItem('k')).toBeNull();
  });
});

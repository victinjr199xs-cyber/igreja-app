import * as aesjs from 'aes-js';

/**
 * Armazenamento da sessão do Supabase criptografado (padrão "LargeSecureStore"
 * da documentação do Supabase).
 *
 * O cofre do sistema (Keychain/Keystore, via expo-secure-store) é o lugar
 * seguro, mas limitado a ~2 KB por item; a sessão passa disso. Então: o texto
 * vai cifrado com AES-256 no AsyncStorage, e só a chave (32 bytes, nova a cada
 * gravação) fica no cofre. Quem copiar o AsyncStorage (backup, celular com
 * root) leva só bytes embaralhados.
 *
 * Sessões gravadas antes desta versão (texto puro) continuam sendo lidas e
 * passam a ser cifradas na próxima gravação: ninguém é deslogado.
 */

export interface KeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface EncryptedStorageDeps {
  /** Cofre do sistema: guarda só a chave de cada item. */
  secure: KeyValue;
  /** Armazenamento comum: guarda o texto cifrado. */
  plain: KeyValue;
  randomBytes: (n: number) => Uint8Array;
}

// Marca os valores cifrados; sem ela, é sessão antiga em texto puro.
const PREFIX = 'enc1:';

export function createEncryptedStorage({ secure, plain, randomBytes }: EncryptedStorageDeps): KeyValue {
  return {
    async getItem(key) {
      const stored = await plain.getItem(key);
      if (stored === null) return null;
      if (!stored.startsWith(PREFIX)) return stored;

      const hexKey = await secure.getItem(key);
      // Sem a chave (outro aparelho, cofre apagado) não há como ler: sessão perdida.
      if (!hexKey) return null;
      try {
        const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hexKey), new aesjs.Counter(1));
        const bytes = cipher.decrypt(aesjs.utils.hex.toBytes(stored.slice(PREFIX.length)));
        return aesjs.utils.utf8.fromBytes(bytes);
      } catch {
        return null;
      }
    },

    async setItem(key, value) {
      // Chave nova a cada gravação: o contador fixo do modo CTR nunca se repete
      // com a mesma chave.
      const keyBytes = randomBytes(32);
      const cipher = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(1));
      const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
      await secure.setItem(key, aesjs.utils.hex.fromBytes(keyBytes));
      await plain.setItem(key, PREFIX + aesjs.utils.hex.fromBytes(encrypted));
    },

    async removeItem(key) {
      await plain.removeItem(key);
      await secure.removeItem(key);
    },
  };
}

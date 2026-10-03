import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { createEncryptedStorage } from './encryptedStorage';

// Só neste aparelho (não vai para backup nem para outro celular) e disponível
// depois do primeiro desbloqueio, para o app abrir logado.
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const sessionStorage = createEncryptedStorage({
  secure: {
    getItem: (k) => SecureStore.getItemAsync(k, secureOptions),
    setItem: (k, v) => SecureStore.setItemAsync(k, v, secureOptions),
    removeItem: (k) => SecureStore.deleteItemAsync(k, secureOptions),
  },
  plain: AsyncStorage,
  randomBytes: (n) => Crypto.getRandomBytes(n),
});

// Projeto Supabase da igreja (Configurações do projeto › API). A anon key é
// pública por natureza: quem protege os dados são as regras do banco (RLS).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const SUPABASE_CONFIGURED = url.startsWith('https://') && anonKey.length > 20;
export const SUPABASE_URL = url;
export const SUPABASE_PUBLIC_KEY = anonKey;

export const supabase = createClient(
  // Sem configuração, um endereço inválido: as chamadas falham com erro claro
  // em vez de o app quebrar na importação.
  SUPABASE_CONFIGURED ? url : 'https://nao-configurado.supabase.co',
  SUPABASE_CONFIGURED ? anonKey : 'nao-configurado',
  {
    auth: {
      // Sessão cifrada: encryptedStorage.ts.
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Login com Google: o navegador devolve um código que o app troca pela
      // sessão (socialAuth.ts). A sessão em si nunca vem na URL.
      flowType: 'pkce',
      detectSessionInUrl: false,
    },
  }
);

// Renova o token só com o app em primeiro plano (recomendação do Supabase
// para React Native: em segundo plano o timer não é confiável).
AppState.addEventListener('change', (state) => {
  if (!SUPABASE_CONFIGURED) return;
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Projeto Supabase da igreja (Configurações do projeto › API). A anon key é
// pública por natureza: quem protege os dados são as regras do banco (RLS).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const SUPABASE_CONFIGURED = url.startsWith('https://') && anonKey.length > 20;

export const supabase = createClient(
  // Sem configuração, um endereço inválido: as chamadas falham com erro claro
  // em vez de o app quebrar na importação.
  SUPABASE_CONFIGURED ? url : 'https://nao-configurado.supabase.co',
  SUPABASE_CONFIGURED ? anonKey : 'nao-configurado',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Não há login por link: a sessão nunca vem na URL.
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

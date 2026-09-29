import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

/**
 * Monitoramento de erros sem serviço de terceiros: grava na tabela
 * app_errors do próprio Supabase (migração 20260929000004). Veja os erros em
 * Supabase › Table Editor › app_errors.
 *
 * Nunca lança nem trava a interface: relatar erro não pode causar outro erro.
 */

// Por sessão: evita inundar a tabela com o mesmo erro repetido em loop.
const MAX_PER_SESSION = 20;
const seen = new Set<string>();
let sent = 0;

const clip = (s: unknown, max: number) => String(s ?? '').slice(0, max);

export function reportError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(clip(error, 500));
  if (__DEV__) console.warn(`[${context}]`, err.message, extra ?? '');

  const fingerprint = `${context}:${err.message}`;
  if (!SUPABASE_CONFIGURED || seen.has(fingerprint) || sent >= MAX_PER_SESSION) return;
  seen.add(fingerprint);
  sent++;

  supabase
    .from('app_errors')
    .insert({
      context: clip(context, 60),
      message: clip(err.message, 500),
      stack: clip(err.stack, 2000),
      extra: extra ?? null,
      app_version: Constants.expoConfig?.version ?? null,
      platform: `${Platform.OS} ${Device.osVersion ?? ''}`.trim(),
      device: Device.modelName ?? null,
    })
    .then(({ error: insertError }) => {
      if (insertError && __DEV__) console.warn('Falha ao relatar erro:', insertError.message);
    });
}

/**
 * Erros de JavaScript que ninguém capturou (inclusive fora da interface):
 * relata e deixa o comportamento padrão do React Native seguir.
 */
export function installGlobalErrorHandler() {
  const g = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  };
  if (!g.ErrorUtils) return;
  const previous = g.ErrorUtils.getGlobalHandler();
  g.ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError(isFatal ? 'fatal' : 'global', error);
    previous(error, isFatal);
  });
}

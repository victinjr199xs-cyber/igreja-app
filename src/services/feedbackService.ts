import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const LIKED_OPTIONS = [
  'Pregações',
  'Rádio',
  'Bíblia',
  'Programação',
  'Visual',
  'Facilidade de uso',
  'Notificações',
] as const;

export interface Feedback {
  rating: number;
  liked: string[];
  comment: string;
  allowReply: boolean;
}

/**
 * Envia a avaliação para a Edge Function send-feedback, que grava no banco e
 * manda o e-mail. A senha do Gmail fica só no servidor, nunca no app.
 */
export async function sendFeedback(feedback: Feedback): Promise<void> {
  const { error } = await supabase.functions.invoke('send-feedback', {
    body: {
      ...feedback,
      appVersion: Constants.expoConfig?.version ?? '',
      platform: `${Platform.OS} ${Device.osVersion ?? ''}`.trim(),
      device: Device.modelName ?? '',
    },
  });
  if (!error) return;

  let code = '';
  if (error instanceof FunctionsHttpError) {
    const status = error.context?.status as number | undefined;
    if (status === 404) code = 'not_deployed';
    else if (status === 429) code = 'too_many';
    else if (status === 401) code = 'not_authenticated';
  }
  throw new Error(code || error.message);
}

export function feedbackErrorMessage(e: unknown): string {
  const msg = String((e as Error)?.message ?? '');
  if (msg === 'not_deployed') return 'As avaliações ainda não foram ativadas. Tente mais tarde.';
  if (msg === 'too_many') return 'Você acabou de enviar uma avaliação. Aguarde um minuto.';
  if (msg === 'not_authenticated') return 'Sua sessão expirou. Entre de novo.';
  if (/network|fetch|failed to send/i.test(msg)) return 'Sem conexão com a internet.';
  return 'Não foi possível enviar agora. Tente novamente.';
}

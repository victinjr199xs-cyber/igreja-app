import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';
import { parseAuthCallback } from '../utils/account';

/** A pessoa fechou o navegador ou a janela da Apple: não é erro para mostrar. */
export class AuthCanceledError extends Error {}

/**
 * Google pelo navegador do sistema (funciona no Expo Go e no APK, sem módulo
 * nativo). O Supabase cuida da conversa com o Google e devolve um código para
 * o app; a sessão chega pelo onAuthStateChange.
 */
export async function signInWithGoogle(): Promise<void> {
  // Expo Go: exp://<ip>:8081/--/auth-callback. APK/iOS: casadeadoracao://auth-callback.
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Sempre mostra a lista de contas: quem tem várias escolhe a certa.
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new AuthCanceledError();

  const { code, error: callbackError } = parseAuthCallback(result.url);
  if (callbackError) throw new Error(callbackError);
  if (!code) throw new Error('Retorno do login sem código');
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error) throw exchanged.error;
}

/** Apple só no iPhone, com a janela nativa (Face ID). No Android exigiria conta Apple paga. */
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

/**
 * Entra com a Apple. Devolve o nome da pessoa: a Apple só informa no primeiro
 * acesso, e o Supabase não o recebe pelo token, então quem chama grava.
 */
export async function signInWithApple(): Promise<string | null> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') throw new AuthCanceledError();
    throw e;
  }
  if (!credential.identityToken) throw new Error('A Apple não devolveu o token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || null;
}

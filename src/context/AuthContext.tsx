import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../services/supabase';
import {
  AvatarSource,
  PermissionDeniedError,
  pickAvatar,
  removeAvatar,
  uploadAvatar,
} from '../services/avatarService';
import { signInWithApple, signInWithGoogle } from '../services/socialAuth';
import { nameFromMetadata, photoFromMetadata } from '../utils/account';

export type SocialProvider = 'google' | 'apple';

interface AuthValue {
  session: Session | null;
  user: User | null;
  /** Nome informado no cadastro. */
  displayName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Google ou Apple. Lança AuthCanceledError se a pessoa desistir. */
  signInWithProvider: (provider: SocialProvider) => Promise<void>;
  /** Por onde a conta entra: 'email', 'google', 'apple'. */
  providers: string[];
  /** Cria a conta; o Supabase envia um código de 6 dígitos para o e-mail. */
  signUp: (name: string, email: string, password: string) => Promise<{ needsCode: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<void>;
  /** Envia o código de recuperação para o e-mail. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Confere o código de recuperação e grava a senha nova (já entra). */
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** URL da foto de perfil, ou null. */
  avatarUrl: string | null;
  /** Abre câmera/galeria e envia. false = a pessoa cancelou. */
  changeAvatar: (source: AvatarSource) => Promise<boolean>;
  deleteAvatar: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  /** Conta acabou de ser criada: mostra a tela de boas-vindas com a foto. */
  isNewAccount: boolean;
  finishOnboarding: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Mínimo de caracteres da senha. Deve bater com Supabase › Authentication ›
 * Providers › Email › Minimum password length (docs/SUPABASE.md). Senhas
 * antigas mais curtas continuam entrando: vale para criar e trocar.
 */
export const MIN_PASSWORD_LENGTH = 8;

// O que é de cada pessoa e fica no aparelho: sai junto com a conta, para quem
// entrar depois no mesmo celular não ver o "continue de onde parou" do outro.
// Preferências do aparelho (tema, letra, notificações) e o cache de conteúdo
// público ficam.
const PERSONAL_KEYS = ['yt:history', 'yt:progress', 'bible:last', 'radio:last'];

async function clearPersonalData() {
  await AsyncStorage.multiRemove(PERSONAL_KEYS).catch(() => {});
}

/** Conta criada agora há pouco: abre as boas-vindas em vez da Início. */
function isFreshAccount(user: User | undefined): boolean {
  if (!user?.created_at) return false;
  return Date.now() - new Date(user.created_at).getTime() < 2 * 60 * 1000;
}

/** Mensagens do Supabase (em inglês) traduzidas para o usuário. */
export function authErrorMessage(error: unknown): string {
  const msg = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  if (!SUPABASE_CONFIGURED) return 'O login ainda não foi configurado neste app.';
  if (error instanceof PermissionDeniedError)
    return 'Permita o acesso à câmera nos ajustes do celular.';
  if (msg.includes('bucket not found') || msg.includes('row-level security'))
    return 'O armazenamento de fotos ainda não foi configurado.';
  if (msg.includes('payload too large') || msg.includes('exceeded the maximum'))
    return 'A foto é grande demais.';
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider'))
    return 'Essa forma de entrar ainda não foi ativada. Use o e-mail.';
  if (msg.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Confirme seu e-mail com o código que enviamos.';
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'Este e-mail já tem conta. Tente entrar.';
  if (msg.includes('password should be') || msg.includes('weak password'))
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (msg.includes('expired') || (msg.includes('invalid') && msg.includes('token')))
    return 'Código inválido ou expirado. Peça um novo.';
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Sem conexão com a internet.';
  if (msg.includes('same') && msg.includes('password'))
    return 'A senha nova precisa ser diferente da anterior.';
  return 'Algo deu errado. Tente novamente.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewAccount, setIsNewAccount] = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    // Sessão salva no aparelho: quem já entrou não vê a tela de login de novo.
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // Google/Apple criam a conta no primeiro login: junto com a sessão, para
      // não piscar a Início antes das boas-vindas.
      if (event === 'SIGNED_IN' && isFreshAccount(s?.user)) setIsNewAccount(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const throwIf = (error: unknown) => {
    if (error) throw error;
  };

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    displayName: nameFromMetadata(session?.user?.user_metadata),
    loading,
    providers: (session?.user?.app_metadata?.providers as string[] | undefined) ?? [],

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      throwIf(error);
    },

    signInWithProvider: async (provider) => {
      if (provider === 'google') return signInWithGoogle();
      const appleName = await signInWithApple();
      const { data } = await supabase.auth.getUser();
      if (appleName && !nameFromMetadata(data.user?.user_metadata)) {
        await supabase.auth.updateUser({ data: { display_name: appleName } });
      }
    },

    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      throwIf(error);
      // Com "Confirm email" desligado no projeto, a sessão já vem pronta.
      if (data.session) setIsNewAccount(true);
      return { needsCode: !data.session };
    },

    confirmSignUp: async (email, code) => {
      // Antes de verificar: a sessão chega pelo onAuthStateChange e o app já
      // deve abrir direto nas boas-vindas, não na Início.
      setIsNewAccount(true);
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'signup',
      });
      if (error) setIsNewAccount(false);
      throwIf(error);
    },

    resendSignUpCode: async (email) => {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
      throwIf(error);
    },

    requestPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      throwIf(error);
    },

    resetPassword: async (email, code, newPassword) => {
      const verified = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      throwIf(verified.error);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      throwIf(error);
    },

    signOut: async () => {
      await supabase.auth.signOut();
      await clearPersonalData();
    },

    deleteAccount: async () => {
      // O Storage não deixa apagar arquivos por SQL: a foto sai pela API antes.
      // Sem foto enviada, o arquivo não existe e o erro é ignorado.
      if (session?.user) {
        await removeAvatar(session.user.id, false).catch(() => {});
      }
      // Função SQL delete_own_account (ver docs/SUPABASE.md): apaga o próprio
      // usuário. O app não tem a chave de administrador, e nem deve ter.
      const { error } = await supabase.rpc('delete_own_account');
      throwIf(error);
      await supabase.auth.signOut();
      await clearPersonalData();
    },

    avatarUrl: photoFromMetadata(session?.user?.user_metadata),

    changeAvatar: async (source) => {
      if (!session?.user) return false;
      const uri = await pickAvatar(source);
      if (!uri) return false;
      await uploadAvatar(session.user.id, uri);
      // updateUser dispara USER_UPDATED; a sessão (e a foto) se atualizam sozinhas.
      return true;
    },

    deleteAvatar: async () => {
      if (!session?.user) return;
      await removeAvatar(session.user.id);
    },

    updateName: async (name) => {
      const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
      throwIf(error);
    },

    changePassword: async (newPassword) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      throwIf(error);
    },

    isNewAccount,
    finishOnboarding: () => setIsNewAccount(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

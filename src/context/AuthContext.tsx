import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIGURED } from '../services/supabase';

interface AuthValue {
  session: Session | null;
  user: User | null;
  /** Nome informado no cadastro. */
  displayName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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
}

const AuthContext = createContext<AuthValue | null>(null);

/** Mensagens do Supabase (em inglês) traduzidas para o usuário. */
export function authErrorMessage(error: unknown): string {
  const msg = String((error as { message?: string })?.message ?? error ?? '').toLowerCase();
  if (!SUPABASE_CONFIGURED) return 'O login ainda não foi configurado neste app.';
  if (msg.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Confirme seu e-mail com o código que enviamos.';
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'Este e-mail já tem conta. Tente entrar.';
  if (msg.includes('password should be') || msg.includes('weak password'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
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
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const throwIf = (error: unknown) => {
    if (error) throw error;
  };

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    displayName: (session?.user?.user_metadata?.name as string) || '',
    loading,

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      throwIf(error);
    },

    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      });
      throwIf(error);
      // Com "Confirm email" desligado no projeto, a sessão já vem pronta.
      return { needsCode: !data.session };
    },

    confirmSignUp: async (email, code) => {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'signup',
      });
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
    },

    deleteAccount: async () => {
      // Função SQL delete_own_account (ver docs/SUPABASE.md): apaga o próprio
      // usuário. O app não tem a chave de administrador, e nem deve ter.
      const { error } = await supabase.rpc('delete_own_account');
      throwIf(error);
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

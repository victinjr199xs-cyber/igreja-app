import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Linking,
  TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import { MIN_PASSWORD_LENGTH, SocialProvider, authErrorMessage, useAuth } from '../context/AuthContext';
import { AuthCanceledError, isAppleAvailable } from '../services/socialAuth';
import { reportError } from '../services/errorReporter';
import ChurchLogo from '../components/ChurchLogo';
import { CHURCH_INFO } from '../data/churchData';

const { width: W, height: H } = Dimensions.get('window');

// Frases que se alternam sob a logo.
const VERSES = [
  { text: 'Vós sois raça eleita, sacerdócio real.', ref: '1 Pedro 2:9' },
  { text: 'Adorai ao Senhor na beleza da santidade.', ref: 'Salmos 96:9' },
  { text: 'Onde dois ou três estão reunidos em meu nome, ali estou.', ref: 'Mateus 18:20' },
  { text: 'Alegrei-me quando me disseram: vamos à casa do Senhor.', ref: 'Salmos 122:1' },
];

type Mode = 'login' | 'signup' | 'verify' | 'forgot' | 'reset';

/** Esfera de luz que flutua devagar no fundo. */
function Orb({ size, x, y, delay, duration }: { size: number; x: number; y: number; delay: number; duration: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.13] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }}
    />
  );
}

/** Versículos que trocam com fade a cada poucos segundos. */
function VerseRotator() {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % VERSES.length);
        Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);
  const v = VERSES[index];
  return (
    <Animated.View style={{ opacity: fade, alignItems: 'center', paddingHorizontal: 32, minHeight: 56 }}>
      <Text style={staticStyles.verse}>“{v.text}”</Text>
      <Text style={staticStyles.verseRef}>{v.ref}</Text>
    </Animated.View>
  );
}

interface FieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: Palette;
}

function Field({ icon, secure, styles, colors, ...input }: FieldProps) {
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.gray} />
      <TextInput
        {...input}
        style={styles.input}
        placeholderTextColor={colors.gray}
        secureTextEntry={secure && hidden}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {secure && (
        <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.gray} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Seis quadradinhos para o código do e-mail (um TextInput invisível por trás). */
function CodeInput({ value, onChange, styles }: { value: string; onChange: (v: string) => void; styles: ReturnType<typeof makeStyles> }) {
  const ref = useRef<TextInput>(null);
  return (
    <TouchableOpacity activeOpacity={1} onPress={() => ref.current?.focus()} style={styles.codeRow}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={[styles.codeBox, i === value.length && styles.codeBoxActive]}>
          <Text style={styles.codeDigit}>{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        style={styles.codeHidden}
      />
    </TouchableOpacity>
  );
}

export default function AuthScreen({ onSkip }: { onSkip?: () => void }) {
  const { styles, colors, isDark } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);

  useEffect(() => {
    isAppleAvailable().then(setAppleAvailable);
  }, []);

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Entrada: logo desce e aparece; o painel sobe com mola.
  const intro = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const tab = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(intro, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(sheet, { toValue: 1, friction: 8, tension: 45, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.spring(tab, {
      toValue: mode === 'signup' ? 1 : 0,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  const go = (next: Mode) => {
    setError(null);
    setInfo(null);
    setCode('');
    setMode(next);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Separado do `busy`: o botão "Entrar" não deve girar durante o login do Google.
  const social = async (provider: SocialProvider) => {
    if (busy || socialBusy) return;
    setSocialBusy(provider);
    setError(null);
    setInfo(null);
    try {
      await auth.signInWithProvider(provider);
    } catch (e) {
      if (e instanceof AuthCanceledError) return;
      reportError(`login-${provider}`, e);
      setError(authErrorMessage(e));
    } finally {
      setSocialBusy(null);
    }
  };

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = () => {
    switch (mode) {
      case 'login':
        return run(() => auth.signIn(email, password));
      case 'signup':
        return run(async () => {
          const { needsCode } = await auth.signUp(name, email, password);
          if (needsCode) go('verify');
        });
      case 'verify':
        return run(() => auth.confirmSignUp(email, code));
      case 'forgot':
        return run(async () => {
          await auth.requestPasswordReset(email);
          go('reset');
          setInfo(`Enviamos um código para ${email.trim()}.`);
        });
      case 'reset':
        return run(() => auth.resetPassword(email, code, password));
    }
  };

  const canSubmit =
    !busy &&
    (mode === 'login'
      ? validEmail && password.length > 0
      : mode === 'signup'
        ? name.trim().length > 1 && validEmail && password.length >= MIN_PASSWORD_LENGTH
        : mode === 'verify'
          ? code.length === 6
          : mode === 'forgot'
            ? validEmail
            : code.length === 6 && password.length >= MIN_PASSWORD_LENGTH);

  const TITLES: Record<Mode, { title: string; subtitle: string; button: string }> = {
    login: { title: 'Que bom te ver!', subtitle: 'Entre para acessar cultos, rádio e a Palavra.', button: 'Entrar' },
    signup: { title: 'Faça parte', subtitle: 'Crie sua conta em menos de um minuto.', button: 'Criar conta' },
    verify: { title: 'Confirme seu e-mail', subtitle: `Digite o código de 6 dígitos enviado para ${email.trim()}.`, button: 'Confirmar' },
    forgot: { title: 'Esqueceu a senha?', subtitle: 'Enviaremos um código para o seu e-mail.', button: 'Enviar código' },
    reset: { title: 'Nova senha', subtitle: 'Digite o código do e-mail e escolha a nova senha.', button: 'Salvar e entrar' },
  };
  const t = TITLES[mode];
  const tabWidth = (W - 2 * 20 - 8) / 2;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#3D1212', '#823030', '#A84A3E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Orb size={260} x={-80} y={-40} delay={0} duration={6000} />
      <Orb size={180} x={W - 120} y={H * 0.12} delay={1200} duration={7000} />
      <Orb size={120} x={W * 0.3} y={H * 0.32} delay={600} duration={5000} />
      <Orb size={90} x={W - 90} y={H * 0.42} delay={2000} duration={6500} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.top,
              { paddingTop: insets.top + 36 },
              {
                opacity: intro,
                transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
              },
            ]}
          >
            <View>
              <Animated.View
                style={[
                  styles.glow,
                  {
                    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
                    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) }],
                  },
                ]}
              />
              <ChurchLogo size="large" align="center" tone="light" />
            </View>
            <View style={styles.divider} />
            <VerseRotator />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 20 },
              {
                opacity: sheet,
                transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [260, 0] }) }],
              },
            ]}
          >
            {(mode === 'login' || mode === 'signup') && (
              <View style={styles.tabs}>
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    { width: tabWidth, transform: [{ translateX: tab.interpolate({ inputRange: [0, 1], outputRange: [0, tabWidth] }) }] },
                  ]}
                />
                {(['login', 'signup'] as const).map((m) => (
                  <TouchableOpacity key={m} style={styles.tab} onPress={() => go(m)}>
                    <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                      {m === 'login' ? 'Entrar' : 'Criar conta'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {mode !== 'login' && mode !== 'signup' && (
              <TouchableOpacity style={styles.back} onPress={() => go('login')} hitSlop={10}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
                <Text style={styles.backText}>Voltar para entrar</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>

            {(mode === 'login' || mode === 'signup') && (
              <>
                {appleAvailable && (
                  <AppleAuthentication.AppleAuthenticationButton
                    // key: o botão nativo não troca o texto depois de montado.
                    key={`${mode}-${isDark}`}
                    buttonType={
                      mode === 'signup'
                        ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                        : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                    }
                    buttonStyle={
                      isDark
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={14}
                    style={styles.appleButton}
                    onPress={() => social('apple')}
                  />
                )}
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={() => social('google')}
                  disabled={busy || socialBusy !== null}
                  activeOpacity={0.8}
                  accessibilityLabel="Continuar com Google"
                >
                  {socialBusy === 'google' ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={colors.text} />
                      <Text style={styles.googleText}>Continuar com Google</Text>
                    </>
                  )}
                </TouchableOpacity>
                <View style={styles.or}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ou com e-mail</Text>
                  <View style={styles.orLine} />
                </View>
              </>
            )}

            {mode === 'signup' && (
              <Field
                icon="person-outline"
                placeholder="Seu nome"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                textContentType="name"
                styles={styles}
                colors={colors}
              />
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
              <Field
                icon="mail-outline"
                placeholder="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                styles={styles}
                colors={colors}
              />
            )}

            {(mode === 'verify' || mode === 'reset') && (
              <CodeInput value={code} onChange={setCode} styles={styles} />
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <Field
                icon="lock-closed-outline"
                placeholder={
                  mode === 'reset'
                    ? `Nova senha (mín. ${MIN_PASSWORD_LENGTH} caracteres)`
                    : mode === 'signup'
                      ? `Senha (mín. ${MIN_PASSWORD_LENGTH} caracteres)`
                      : 'Senha'
                }
                value={password}
                onChangeText={setPassword}
                secure
                autoCapitalize="none"
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                styles={styles}
                colors={colors}
              />
            )}

            {mode === 'login' && (
              <TouchableOpacity onPress={() => go('forgot')} style={styles.forgot} hitSlop={8}>
                <Text style={styles.link}>Esqueci minha senha</Text>
              </TouchableOpacity>
            )}

            {error && (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {info && !error && (
              <View style={styles.info}>
                <Ionicons name="mail-open-outline" size={18} color={colors.primary} />
                <Text style={styles.infoText}>{info}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              disabled={!canSubmit}
              onPress={submit}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonFill}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>{t.button}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {mode === 'verify' && (
              <TouchableOpacity
                onPress={() =>
                  run(async () => {
                    await auth.resendSignUpCode(email);
                    setInfo('Enviamos um novo código.');
                  })
                }
                style={styles.center}
                hitSlop={8}
              >
                <Text style={styles.link}>Não recebeu? Enviar de novo</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.legal}>
              Ao continuar, você concorda com a{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(CHURCH_INFO.privacyPolicy)}>
                Política de Privacidade
              </Text>
              .
            </Text>

            {onSkip && (
              <TouchableOpacity onPress={onSkip} style={styles.center}>
                <Text style={styles.devSkip}>
                  Login não configurado · continuar (só em desenvolvimento)
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Estilos sobre o degradê: não mudam com o tema.
const staticStyles = StyleSheet.create({
  verse: {
    ...FONTS.regular,
    fontStyle: 'italic',
    fontSize: SIZES.font,
    color: '#FFFFFFE6',
    textAlign: 'center',
    lineHeight: 20,
  },
  verseRef: {
    ...FONTS.mono,
    fontSize: 11,
    color: '#FFFFFFAA',
    marginTop: 4,
  },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#3D1212',
    },
    top: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 28,
      minHeight: 280,
    },
    glow: {
      position: 'absolute',
      alignSelf: 'center',
      top: -40,
      width: 260,
      height: 160,
      borderRadius: 130,
      backgroundColor: '#FFFFFF',
    },
    divider: {
      width: 40,
      height: 3,
      borderRadius: 2,
      backgroundColor: '#FFFFFF66',
      marginVertical: 18,
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 20,
      paddingTop: 22,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 20,
    },
    tabIndicator: {
      position: 'absolute',
      top: 4,
      left: 4,
      bottom: 4,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    tab: {
      flex: 1,
      paddingVertical: 11,
      alignItems: 'center',
    },
    tabText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.textLight,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    back: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      alignSelf: 'flex-start',
    },
    backText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
    },
    title: {
      ...FONTS.bold,
      fontSize: 26,
      color: c.text,
    },
    subtitle: {
      ...FONTS.regular,
      fontSize: SIZES.font,
      color: c.textLight,
      marginTop: 4,
      marginBottom: 18,
      lineHeight: 20,
    },
    appleButton: {
      width: '100%',
      height: 52,
      marginBottom: 10,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    googleText: {
      ...FONTS.medium,
      fontSize: SIZES.medium,
      color: c.text,
    },
    or: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 16,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.border,
    },
    orText: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: 14,
      height: 54,
      marginBottom: 12,
    },
    fieldFocused: {
      borderColor: c.primary,
    },
    input: {
      ...FONTS.regular,
      flex: 1,
      fontSize: SIZES.medium,
      color: c.text,
      height: '100%',
    },
    forgot: {
      alignSelf: 'flex-end',
      marginTop: -2,
      marginBottom: 6,
    },
    link: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
    },
    codeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    codeBox: {
      width: (W - 40 - 5 * 8) / 6,
      height: 58,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    codeBoxActive: {
      borderColor: c.primary,
    },
    codeDigit: {
      ...FONTS.bold,
      fontSize: 24,
      color: c.text,
    },
    codeHidden: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
    },
    error: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.error + '18',
      borderRadius: 12,
      padding: 12,
      marginTop: 6,
    },
    errorText: {
      ...FONTS.medium,
      flex: 1,
      fontSize: SIZES.font,
      color: c.error,
    },
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.primary + '14',
      borderRadius: 12,
      padding: 12,
      marginTop: 6,
    },
    infoText: {
      ...FONTS.medium,
      flex: 1,
      fontSize: SIZES.font,
      color: c.text,
    },
    button: {
      marginTop: 16,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonFill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 56,
    },
    buttonText: {
      ...FONTS.bold,
      fontSize: SIZES.large,
      color: '#FFFFFF',
    },
    center: {
      alignItems: 'center',
      marginTop: 14,
    },
    legal: {
      ...FONTS.regular,
      fontSize: 11,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 18,
    },
    legalLink: {
      ...FONTS.medium,
      color: c.primary,
      textDecorationLine: 'underline',
    },
    devSkip: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.gray,
      textDecorationLine: 'underline',
    },
  });

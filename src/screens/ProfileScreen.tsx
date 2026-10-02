import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import { PASSWORD_RULE, authErrorMessage, isStrongPassword, useAuth } from '../context/AuthContext';
import { useAvatarPicker } from '../hooks/useAvatarPicker';
import Avatar from '../components/Avatar';
import { reportError } from '../services/errorReporter';

const PROVIDER_LABELS: Record<string, string> = { email: 'E-mail', google: 'Google', apple: 'Apple' };

export default function ProfileScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { user, displayName, providers, updateName, changePassword, signOut, deleteAccount } = useAuth();
  // Quem entrou só por Google/Apple não tem senha: a primeira é "criar".
  const hasPassword = providers.length === 0 || providers.includes('email');
  const linked = providers
    .map((p) => PROVIDER_LABELS[p] ?? p)
    .join(' · ');
  const { busy: avatarBusy, openMenu } = useAvatarPicker();

  const [name, setName] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => setName(displayName), [displayName]);

  const nameChanged = name.trim().length > 1 && name.trim() !== displayName.trim();
  const passwordOk = isStrongPassword(password) && password === confirm;

  const saveName = async () => {
    setSavingName(true);
    try {
      await updateName(name);
    } catch (e) {
      Alert.alert('Não foi possível salvar', authErrorMessage(e));
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    setSavingPassword(true);
    try {
      await changePassword(password);
      setPassword('');
      setConfirm('');
      setShowPassword(false);
      Alert.alert(
        hasPassword ? 'Senha alterada' : 'Senha criada',
        hasPassword ? 'Use a nova senha no próximo acesso.' : 'Agora você também pode entrar com e-mail e senha.'
      );
    } catch (e) {
      Alert.alert('Não foi possível alterar', authErrorMessage(e));
    } finally {
      setSavingPassword(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo para usar o app.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      'Excluir sua conta?',
      'Sua conta, sua foto e seus dados de acesso serão apagados para sempre. Isso não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (e) {
              reportError('delete-account', e);
              Alert.alert('Não foi possível excluir', authErrorMessage(e));
            }
          },
        },
      ]
    );

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu} activeOpacity={0.85} accessibilityLabel="Trocar foto de perfil">
            <Avatar size={116} editable busy={avatarBusy} />
          </TouchableOpacity>
          <Text style={styles.name}>{displayName || 'Membro'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {memberSince && <Text style={styles.since}>Membro do app desde {memberSince}</Text>}
          <TouchableOpacity onPress={openMenu} disabled={avatarBusy} hitSlop={8}>
            <Text style={styles.link}>Trocar foto</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>DADOS</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Nome</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.gray}
              autoCapitalize="words"
            />
            {nameChanged && (
              <TouchableOpacity style={styles.save} onPress={saveName} disabled={savingName}>
                {savingName ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.saveText}>Salvar</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>E-mail</Text>
          <View style={[styles.inputRow, styles.readonly]}>
            <Text style={styles.readonlyText}>{user?.email}</Text>
            <Ionicons name="lock-closed" size={16} color={colors.gray} />
          </View>

          {linked.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Entra com</Text>
              <Text style={styles.readonlyText}>{linked}</Text>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>SEGURANÇA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name="key-outline" size={22} color={colors.primary} />
            <Text style={styles.rowTitle}>{hasPassword ? 'Alterar senha' : 'Criar senha para entrar por e-mail'}</Text>
            <Ionicons name={showPassword ? 'chevron-up' : 'chevron-down'} size={18} color={colors.gray} />
          </TouchableOpacity>
          {showPassword && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={styles.field}
                value={password}
                onChangeText={setPassword}
                placeholder="Nova senha"
                placeholderTextColor={colors.gray}
                secureTextEntry
                textContentType="newPassword"
              />
              <TextInput
                style={[styles.field, { marginTop: 10 }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repita a nova senha"
                placeholderTextColor={colors.gray}
                secureTextEntry
                textContentType="newPassword"
              />
              {password.length > 0 && !isStrongPassword(password) ? (
                <Text style={styles.warn}>A senha precisa ter {PASSWORD_RULE}.</Text>
              ) : (
                confirm.length > 0 &&
                password !== confirm && <Text style={styles.warn}>As senhas não são iguais.</Text>
              )}
              <TouchableOpacity
                style={[styles.primary, !passwordOk && { opacity: 0.45 }]}
                disabled={!passwordOk || savingPassword}
                onPress={savePassword}
              >
                {savingPassword ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryText}>Salvar nova senha</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>CONTA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={confirmSignOut}>
            <Ionicons name="log-out-outline" size={22} color={colors.primary} />
            <Text style={styles.rowTitle}>Sair</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={confirmDelete}>
            <Ionicons name="person-remove-outline" size={22} color={colors.error} />
            <Text style={[styles.rowTitle, { color: colors.error }]}>Excluir conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: SIZES.padding,
      paddingBottom: 48,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    name: {
      ...FONTS.bold,
      fontSize: SIZES.extraLarge,
      color: c.text,
      marginTop: 14,
    },
    email: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    since: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 6,
    },
    link: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
      marginTop: 12,
    },
    sectionTitle: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      letterSpacing: 1,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      padding: SIZES.padding,
    },
    label: {
      ...FONTS.medium,
      fontSize: SIZES.small,
      color: c.textLight,
      marginBottom: 6,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingLeft: 12,
      paddingRight: 6,
      minHeight: 46,
    },
    input: {
      ...FONTS.regular,
      flex: 1,
      fontSize: SIZES.medium,
      color: c.text,
      paddingVertical: 10,
    },
    save: {
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      minWidth: 70,
      alignItems: 'center',
    },
    saveText: {
      ...FONTS.medium,
      fontSize: SIZES.small,
      color: c.white,
    },
    readonly: {
      backgroundColor: c.lightGray,
      paddingRight: 12,
    },
    readonlyText: {
      ...FONTS.regular,
      flex: 1,
      fontSize: SIZES.medium,
      color: c.textLight,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: 10,
      paddingTop: 14,
    },
    rowTitle: {
      ...FONTS.medium,
      flex: 1,
      fontSize: SIZES.medium,
      color: c.text,
    },
    field: {
      ...FONTS.regular,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: SIZES.medium,
      color: c.text,
    },
    warn: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.error,
      marginTop: 6,
    },
    primary: {
      backgroundColor: c.primary,
      borderRadius: SIZES.radius,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 14,
    },
    primaryText: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.white,
    },
  });

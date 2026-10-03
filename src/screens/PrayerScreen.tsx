import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { CHURCH_INFO } from '../data/churchData';

/**
 * Pedido de oração enviado pelo WhatsApp da igreja: sem servidor, e quem
 * recebe pode responder direto à pessoa.
 */
export default function PrayerScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { displayName } = useAuth();
  // Já vem com o nome da conta; quem preferir pedir anonimamente apaga.
  const [name, setName] = useState(displayName);
  const [request, setRequest] = useState('');
  const [wantsContact, setWantsContact] = useState(false);

  const canSend = request.trim().length > 0;

  const send = async () => {
    const lines = [
      '🙏 *Pedido de oração* (pelo app)',
      '',
      `*Nome:* ${name.trim() || 'Não informado'}`,
      '',
      request.trim(),
      '',
      wantsContact ? '📞 Gostaria que alguém entrasse em contato.' : '',
    ].filter((l, i, all) => !(l === '' && all[i - 1] === ''));
    const url = `https://wa.me/${CHURCH_INFO.phoneE164}?text=${encodeURIComponent(lines.join('\n').trim())}`;
    try {
      await Linking.openURL(url);
      setRequest('');
    } catch {
      Alert.alert('Não foi possível abrir o WhatsApp', 'Verifique se ele está instalado.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="heart" size={26} color={colors.white} />
          </View>
          <Text style={styles.introTitle}>Como podemos orar por você?</Text>
          <Text style={styles.introText}>
            Seu pedido vai para a equipe de intercessão da Casa de Adoração pelo WhatsApp.
          </Text>
          <Text style={styles.verse}>
            “Confessai as vossas culpas uns aos outros, e orai uns pelos outros.” — Tiago 5:16
          </Text>
        </View>

        <Text style={styles.label}>SEU NOME (OPCIONAL)</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Como podemos te chamar"
          placeholderTextColor={colors.gray}
          autoCapitalize="words"
        />

        <Text style={styles.label}>PEDIDO</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={request}
          onChangeText={setRequest}
          placeholder="Escreva aqui o seu pedido de oração"
          placeholderTextColor={colors.gray}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Quero que entrem em contato</Text>
            <Text style={styles.switchDetail}>Alguém da igreja pode te responder</Text>
          </View>
          <Switch
            value={wantsContact}
            onValueChange={setWantsContact}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>

        <TouchableOpacity
          style={[styles.send, !canSend && styles.sendDisabled]}
          disabled={!canSend}
          onPress={send}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
          <Text style={styles.sendText}>Enviar pelo WhatsApp</Text>
        </TouchableOpacity>
        <Text style={styles.note}>
          O WhatsApp abre com a mensagem pronta; é só tocar em enviar. Enviado para{' '}
          {CHURCH_INFO.phoneDisplay}.
        </Text>
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
      paddingBottom: 40,
    },
    intro: {
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius + 4,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
    },
    introIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    introTitle: {
      ...FONTS.bold,
      fontSize: SIZES.xl,
      color: c.text,
      marginTop: 12,
      textAlign: 'center',
    },
    introText: {
      ...FONTS.regular,
      fontSize: SIZES.font,
      color: c.textLight,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 20,
    },
    verse: {
      ...FONTS.regular,
      fontStyle: 'italic',
      fontSize: SIZES.small,
      color: c.primary,
      marginTop: 12,
      textAlign: 'center',
    },
    label: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      letterSpacing: 1,
      marginTop: 14,
      marginBottom: 6,
      marginLeft: 4,
    },
    input: {
      ...FONTS.regular,
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: SIZES.medium,
      color: c.text,
    },
    textarea: {
      minHeight: 140,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginTop: 14,
    },
    switchTitle: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
    },
    switchDetail: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    send: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: SIZES.radius,
      paddingVertical: 15,
      marginTop: 20,
    },
    sendDisabled: {
      opacity: 0.45,
    },
    sendText: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.white,
    },
    note: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 10,
    },
  });

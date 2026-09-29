import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import { CHURCH_INFO } from '../data/churchData';
import { buildPixPayload } from '../services/pixService';

/** Só aparece no app quando CHURCH_INFO.pix.key está preenchida. */
export const GIVING_ENABLED = CHURCH_INFO.pix.key.trim().length > 0;

export default function GiveScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const [copied, setCopied] = useState<'key' | 'code' | null>(null);

  const payload = useMemo(
    () => buildPixPayload({ ...CHURCH_INFO.pix, description: 'Oferta' }),
    []
  );

  const copy = async (what: 'key' | 'code') => {
    await Clipboard.setStringAsync(what === 'key' ? CHURCH_INFO.pix.key : payload);
    setCopied(what);
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.verse}>
        “Cada um contribua segundo propôs no seu coração; não com tristeza, ou por necessidade;
        porque Deus ama ao que dá com alegria.”
      </Text>
      <Text style={styles.verseRef}>2 Coríntios 9:7</Text>

      <View style={styles.card}>
        <View style={styles.pixHeader}>
          <Ionicons name="flash" size={18} color={colors.primary} />
          <Text style={styles.pixTitle}>Pix</Text>
        </View>

        {/* Fundo branco sempre: leitores de QR falham com o código invertido. */}
        <View style={styles.qrBox}>
          <QRCode value={payload} size={200} backgroundColor="#FFFFFF" color="#000000" />
        </View>
        <Text style={styles.hint}>Abra o app do seu banco, escolha Pix › Ler QR code</Text>

        <TouchableOpacity style={styles.primary} onPress={() => copy('code')}>
          <Ionicons
            name={copied === 'code' ? 'checkmark' : 'copy-outline'}
            size={18}
            color={colors.white}
          />
          <Text style={styles.primaryText}>
            {copied === 'code' ? 'Código copiado!' : 'Copiar Pix copia e cola'}
          </Text>
        </TouchableOpacity>

        <View style={styles.keyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.keyLabel}>CHAVE PIX</Text>
            <Text style={styles.keyValue} selectable>
              {CHURCH_INFO.pix.key}
            </Text>
            <Text style={styles.keyHolder}>{CHURCH_INFO.pix.holder}</Text>
          </View>
          <TouchableOpacity style={styles.copyKey} onPress={() => copy('key')}>
            <Ionicons
              name={copied === 'key' ? 'checkmark' : 'copy-outline'}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.copyKeyText}>{copied === 'key' ? 'Copiada' : 'Copiar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.note}>
        Confira o nome do recebedor no app do banco antes de confirmar. O valor você escolhe na
        hora do pagamento.
      </Text>
    </ScrollView>
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
    verse: {
      ...FONTS.regular,
      fontStyle: 'italic',
      fontSize: SIZES.medium,
      lineHeight: 24,
      color: c.text,
      textAlign: 'center',
      marginTop: 8,
    },
    verseRef: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.primary,
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 16,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: SIZES.radius + 4,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    pixHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
    },
    pixTitle: {
      ...FONTS.bold,
      fontSize: SIZES.large,
      color: c.text,
    },
    qrBox: {
      backgroundColor: '#FFFFFF',
      padding: 14,
      borderRadius: SIZES.radius,
      marginTop: 14,
    },
    hint: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 10,
      textAlign: 'center',
    },
    primary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: SIZES.radius,
      paddingVertical: 13,
      alignSelf: 'stretch',
      marginTop: 16,
    },
    primaryText: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.white,
    },
    keyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: 16,
      paddingTop: 14,
    },
    keyLabel: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      letterSpacing: 1,
    },
    keyValue: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.text,
      marginTop: 2,
    },
    keyHolder: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    copyKey: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: SIZES.radius,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    copyKeyText: {
      ...FONTS.medium,
      fontSize: SIZES.small,
      color: c.primary,
    },
    note: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 14,
      lineHeight: 18,
    },
  });

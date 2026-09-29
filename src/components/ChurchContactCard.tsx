import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import { CHURCH_INFO } from '../data/churchData';
import { callChurch, openChurchMap, whatsappChurch } from '../services/contactService';

/** Endereço da igreja com os atalhos: como chegar, WhatsApp e ligar. */
export default function ChurchContactCard() {
  const { styles, colors } = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.addressRow} onPress={openChurchMap} activeOpacity={0.7}>
        <View style={styles.pin}>
          <Ionicons name="location" size={22} color={colors.white} />
        </View>
        <View style={styles.addressText}>
          <Text style={styles.label}>ONDE ESTAMOS</Text>
          <Text style={styles.street}>{CHURCH_INFO.street}</Text>
          <Text style={styles.city}>
            {CHURCH_INFO.district} · {CHURCH_INFO.city}
          </Text>
          <Text style={styles.city}>CEP {CHURCH_INFO.zip}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={openChurchMap}>
        <Ionicons name="navigate" size={18} color={colors.white} />
        <Text style={styles.primaryText}>Como chegar</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryButton} onPress={whatsappChurch}>
          <Ionicons name="logo-whatsapp" size={18} color={colors.primary} />
          <Text style={styles.secondaryText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={callChurch}>
          <Ionicons name="call" size={18} color={colors.primary} />
          <Text style={styles.secondaryText}>Ligar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.phone}>{CHURCH_INFO.phoneDisplay}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: SIZES.padding,
      borderWidth: 1,
      borderColor: c.border,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    pin: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    addressText: {
      flex: 1,
    },
    label: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      letterSpacing: 1,
    },
    street: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.text,
      marginTop: 2,
    },
    city: {
      ...FONTS.regular,
      fontSize: SIZES.font,
      color: c.textLight,
      marginTop: 1,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: SIZES.radius,
      paddingVertical: 12,
      marginTop: 14,
    },
    primaryText: {
      ...FONTS.medium,
      fontSize: SIZES.medium,
      color: c.white,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.primary,
      paddingVertical: 11,
    },
    secondaryText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
    },
    phone: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 10,
    },
  });

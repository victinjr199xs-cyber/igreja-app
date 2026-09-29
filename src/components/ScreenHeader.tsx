import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ChurchLogo from './ChurchLogo';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/**
 * Cabeçalho comum a todas as abas: logo da igreja no topo (com o atalho para
 * Configurações) e, abaixo, o título da tela com a barra vinho vertical que o
 * banner do canal usa nos horários.
 */
export default function ScreenHeader({ title, subtitle, right }: Props) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.logoRow}>
        <ChurchLogo />
        <TouchableOpacity
          onPress={() => navigation.navigate('Configurações')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleRow}>
        <View style={styles.bar} />
        <View style={styles.titleText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      paddingHorizontal: SIZES.padding,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    logoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
    },
    bar: {
      width: 3,
      alignSelf: 'stretch',
      backgroundColor: c.primary,
      marginRight: 10,
    },
    titleText: {
      flex: 1,
    },
    title: {
      ...FONTS.bold,
      fontSize: SIZES.extraLarge,
      color: c.text,
    },
    subtitle: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
  });

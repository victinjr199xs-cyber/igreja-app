import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import ChurchLogo from './ChurchLogo';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/**
 * Cabeçalho comum a todas as abas: logo da igreja no topo e, abaixo, o título
 * da tela com a barra vinho vertical que o banner do canal usa nos horários.
 */
export default function ScreenHeader({ title, subtitle, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <ChurchLogo />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  bar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: COLORS.primary,
    marginRight: 10,
  },
  titleText: {
    flex: 1,
  },
  title: {
    ...FONTS.bold,
    fontSize: SIZES.extraLarge,
    color: COLORS.text,
  },
  subtitle: {
    ...FONTS.mono,
    fontSize: SIZES.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
});

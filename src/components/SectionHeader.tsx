import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';

interface Props {
  title: string;
  /** Link à direita, ex.: "Ver todas". */
  action?: string;
  onAction?: () => void;
  /** Cor da barrinha; padrão, o vinho da marca. */
  accent?: string;
  /** Margem lateral: telas com padding próprio passam 0. */
  inset?: number;
}

/** Título de seção com a barra vertical do banner da igreja. */
export default function SectionHeader({ title, action, onAction, accent, inset = SIZES.padding }: Props) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, { marginHorizontal: inset }]}>
      <View style={[styles.bar, accent ? { backgroundColor: accent } : null]} />
      <Text style={styles.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 10,
    },
    bar: {
      width: 3,
      height: 18,
      backgroundColor: c.primary,
      marginRight: 8,
    },
    title: {
      ...FONTS.bold,
      flex: 1,
      fontSize: SIZES.large,
      color: c.text,
    },
    action: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.primary,
    },
  });

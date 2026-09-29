import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

interface Props {
  size?: 'small' | 'large';
  align?: 'left' | 'center';
}

/**
 * A logo da igreja é tipográfica, então é recriada em texto em vez de imagem:
 * fica nítida em qualquer tela e sem o fundo texturizado do arquivo original.
 */
export default function ChurchLogo({ size = 'small', align = 'left' }: Props) {
  const large = size === 'large';
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <View>
        <Text style={[styles.name, { fontSize: large ? 36 : 22 }]}>Casa de Adoração</Text>
        <Text style={[styles.tagline, { fontSize: large ? 14 : 11 }]}>Reino de Sacerdotes</Text>
        {large && <Text style={[styles.tagline, { fontSize: 14 }]}>Trindade-GO</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  name: {
    ...FONTS.bold,
    color: COLORS.primary,
    letterSpacing: -0.3,
  },
  // Na logo, o subtítulo fica alinhado à direita, sob o fim do nome.
  tagline: {
    ...FONTS.mono,
    color: COLORS.text,
    textAlign: 'right',
  },
});

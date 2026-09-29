import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  size: number;
  /** Selo de câmera no canto: indica que dá para trocar a foto. */
  editable?: boolean;
  busy?: boolean;
  /** Borda branca, para fundos coloridos. */
  ring?: boolean;
}

/** Foto de perfil do usuário logado; sem foto, as iniciais do nome. */
export default function Avatar({ size, editable, busy, ring }: Props) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { avatarUrl, displayName, user } = useAuth();
  const [failed, setFailed] = useState<string | null>(null);

  const initials =
    (displayName || user?.email || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?';

  // Se a URL der erro (arquivo apagado, sem rede), volta para as iniciais.
  const showPhoto = avatarUrl && failed !== avatarUrl;
  const badge = Math.max(22, size * 0.3);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2 },
          ring && { borderWidth: Math.max(2, size * 0.04), borderColor: '#FFFFFF' },
        ]}
      >
        {showPhoto ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: '100%', height: '100%' }}
            onError={() => setFailed(avatarUrl)}
          />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        )}
        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>
      {editable && !busy && (
        <View
          style={[
            styles.badge,
            { width: badge, height: badge, borderRadius: badge / 2 },
          ]}
        >
          <Ionicons name="camera" size={badge * 0.55} color={colors.white} />
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    circle: {
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    initials: {
      ...FONTS.bold,
      color: '#FFFFFF',
    },
    busy: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: c.primary,
      borderWidth: 2,
      borderColor: c.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useAvatarPicker } from '../hooks/useAvatarPicker';
import Avatar from '../components/Avatar';

/**
 * Logo após criar a conta: convida a pessoa a colocar uma foto. Mesmo visual
 * da tela de entrada, para parecer a continuação dela.
 */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { displayName, avatarUrl, finishOnboarding } = useAuth();
  const { busy, pick } = useAvatarPicker();
  const firstName = displayName.trim().split(/\s+/)[0] || '';

  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#3D1212', '#823030', '#A84A3E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          {
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}
      >
        <View style={styles.center}>
          <Text style={styles.hello}>Boas-vindas{firstName ? `, ${firstName}` : ''}! 🎉</Text>
          <Text style={styles.subtitle}>
            Sua conta está pronta. Que tal colocar uma foto para deixar o app com a sua cara?
          </Text>

          <TouchableOpacity onPress={() => pick('library')} activeOpacity={0.85} style={styles.avatarBox}>
            <Animated.View
              style={[
                styles.halo,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
                },
              ]}
            />
            <Avatar size={150} ring editable busy={busy} />
          </TouchableOpacity>

          {avatarUrl && !busy && <Text style={styles.done}>Ficou ótima! ✨</Text>}
        </View>

        <View>
          {!avatarUrl ? (
            <>
              <TouchableOpacity style={styles.primary} onPress={() => pick('camera')} disabled={busy}>
                <Ionicons name="camera" size={20} color="#823030" />
                <Text style={styles.primaryText}>Tirar uma foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={() => pick('library')} disabled={busy}>
                <Ionicons name="images" size={20} color="#fff" />
                <Text style={styles.secondaryText}>Escolher da galeria</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skip} onPress={finishOnboarding} disabled={busy}>
                <Text style={styles.skipText}>Pular por agora</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.primary} onPress={finishOnboarding} disabled={busy}>
                <Text style={styles.primaryText}>Começar</Text>
                <Ionicons name="arrow-forward" size={20} color="#823030" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skip} onPress={() => pick('library')} disabled={busy}>
                <Text style={styles.skipText}>Escolher outra foto</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#3D1212',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    marginTop: 20,
  },
  hello: {
    ...FONTS.bold,
    fontSize: 30,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.regular,
    fontSize: SIZES.medium,
    color: '#ffffffD9',
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  avatarBox: {
    marginTop: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#fff',
  },
  done: {
    ...FONTS.medium,
    fontSize: SIZES.medium,
    color: '#fff',
    marginTop: 22,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 56,
  },
  primaryText: {
    ...FONTS.bold,
    fontSize: SIZES.large,
    color: '#823030',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#ffffff99',
    marginTop: 12,
  },
  secondaryText: {
    ...FONTS.bold,
    fontSize: SIZES.large,
    color: '#fff',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    ...FONTS.medium,
    fontSize: SIZES.font,
    color: '#ffffffCC',
    textDecorationLine: 'underline',
  },
});

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FONTS, SIZES, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { LIKED_OPTIONS, feedbackErrorMessage, sendFeedback } from '../services/feedbackService';

const LABELS = ['Toque nas estrelas', 'Muito ruim 😞', 'Ruim 😕', 'Regular 😐', 'Bom 🙂', 'Excelente! 🤩'];

const PROMPTS = [
  'Conte o que achou do app',
  'O que deu errado? Queremos corrigir.',
  'O que podemos melhorar?',
  'O que faria o app ficar melhor?',
  'Que bom! Tem alguma sugestão?',
  'Que alegria! Conte o que você mais gostou.',
];

export default function FeedbackScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const navigation = useNavigation();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [allowReply, setAllowReply] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Cada estrela "pula" quando é tocada.
  const scales = useRef(Array.from({ length: 5 }, () => new Animated.Value(1))).current;
  const thanks = useRef(new Animated.Value(0)).current;

  const rate = (value: number) => {
    setRating(value);
    for (let i = 0; i < value; i++) {
      Animated.sequence([
        Animated.delay(i * 50),
        Animated.spring(scales[i], { toValue: 1.35, friction: 3, useNativeDriver: true }),
        Animated.spring(scales[i], { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  };

  const toggle = (option: string) =>
    setLiked((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await sendFeedback({ rating, liked, comment, allowReply });
      setSent(true);
      Animated.spring(thanks, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    } catch (e) {
      setError(feedbackErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.thanksBox]}>
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: thanks,
            transform: [{ scale: thanks.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <View style={styles.thanksIcon}>
            <Ionicons name="heart" size={44} color={colors.white} />
          </View>
          <Text style={styles.thanksTitle}>Obrigado pela avaliação!</Text>
          <Text style={styles.thanksText}>
            Sua opinião chegou para a equipe e vai ajudar a deixar o app cada vez melhor.
          </Text>
          <TouchableOpacity style={styles.primary} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryText}>Voltar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>O que você está achando do app?</Text>
        <Text style={styles.subtitle}>Sua avaliação vai direto para a equipe da Casa de Adoração.</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => rate(n)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            >
              <Animated.View style={{ transform: [{ scale: scales[n - 1] }] }}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={46}
                  color={n <= rating ? colors.gold : colors.border}
                />
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.ratingLabel, rating > 0 && { color: colors.text }]}>{LABELS[rating]}</Text>

        {rating > 0 && (
          <>
            <Text style={styles.section}>DO QUE VOCÊ MAIS GOSTA? (OPCIONAL)</Text>
            <View style={styles.chips}>
              {LIKED_OPTIONS.map((option) => {
                const active = liked.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggle(option)}
                  >
                    {active && <Ionicons name="checkmark" size={14} color={colors.white} />}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.section}>COMENTÁRIO (OPCIONAL)</Text>
            <TextInput
              style={styles.textarea}
              value={comment}
              onChangeText={setComment}
              placeholder={PROMPTS[rating]}
              placeholderTextColor={colors.gray}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{comment.length}/2000</Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Podem me responder</Text>
                <Text style={styles.switchDetail}>
                  A equipe poderá responder no seu e-mail ({user?.email})
                </Text>
              </View>
              <Switch
                value={allowReply}
                onValueChange={setAllowReply}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>

            {error && (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.primary} onPress={submit} disabled={sending}>
              {sending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={colors.white} />
                  <Text style={styles.primaryText}>Enviar avaliação</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
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
    title: {
      ...FONTS.bold,
      fontSize: SIZES.extraLarge,
      color: c.text,
      textAlign: 'center',
      marginTop: 12,
    },
    subtitle: {
      ...FONTS.regular,
      fontSize: SIZES.font,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 6,
    },
    stars: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
    },
    ratingLabel: {
      ...FONTS.medium,
      fontSize: SIZES.large,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 12,
    },
    section: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      letterSpacing: 1,
      marginTop: 26,
      marginBottom: 10,
      marginLeft: 4,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      ...FONTS.medium,
      fontSize: SIZES.font,
      color: c.text,
    },
    chipTextActive: {
      color: c.white,
    },
    textarea: {
      ...FONTS.regular,
      minHeight: 120,
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      fontSize: SIZES.medium,
      color: c.text,
    },
    counter: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      textAlign: 'right',
      marginTop: 4,
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
    error: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.error + '18',
      borderRadius: 12,
      padding: 12,
      marginTop: 14,
    },
    errorText: {
      ...FONTS.medium,
      flex: 1,
      fontSize: SIZES.font,
      color: c.error,
    },
    primary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: SIZES.radius,
      paddingVertical: 15,
      paddingHorizontal: 32,
      marginTop: 20,
    },
    primaryText: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.white,
    },
    thanksBox: {
      justifyContent: 'center',
      padding: 32,
    },
    thanksIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    thanksTitle: {
      ...FONTS.bold,
      fontSize: SIZES.extraLarge,
      color: c.text,
      marginTop: 20,
      textAlign: 'center',
    },
    thanksText: {
      ...FONTS.regular,
      fontSize: SIZES.medium,
      color: c.textLight,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 22,
    },
  });

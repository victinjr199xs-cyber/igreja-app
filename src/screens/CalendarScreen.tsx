import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';
import ChurchContactCard from '../components/ChurchContactCard';
import SectionHeader from '../components/SectionHeader';
import {
  CHURCH_INFO,
  WEEKLY_EVENTS,
  allSpecialEvents,
  Occurrence,
  dateKey,
  eventsOn,
  getCurrentEvent,
  getNextEvent,
  nextDateOf,
} from '../data/churchData';
import { openChurchMap } from '../services/contactService';
import { useChurchContent } from '../context/ContentContext';
import { addToPhoneCalendar, shareInvite } from '../services/agendaService';
import {
  DAYS,
  DAYS_SHORT,
  MONTHS,
  MONTHS_SHORT,
  countdown,
  describeDay,
  parseDateKey,
} from '../utils/format';

LocaleConfig.locales['pt-br'] = {
  monthNames: MONTHS.map((m) => m[0].toUpperCase() + m.slice(1)),
  monthNamesShort: MONTHS_SHORT,
  dayNames: DAYS,
  dayNamesShort: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

export default function CalendarScreen() {
  const { styles, colors, isDark } = useThemedStyles(makeStyles);
  // Assina o conteúdo online: quando os eventos chegam, a tela redesenha.
  const content = useChurchContent();
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // A contagem regressiva anda de minuto em minuto.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const live = getCurrentEvent(now);
  const next = getNextEvent(now);
  const left = next ? countdown(next.date, now) : null;

  // Marca os dias com programação no mês visível.
  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    const days = new Date(visibleMonth.year, visibleMonth.month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const day = new Date(visibleMonth.year, visibleMonth.month, d);
      const occ = eventsOn(day);
      if (occ.length === 0) continue;
      const special = occ.some((o) => o.special);
      marks[dateKey(day)] = { marked: true, dotColor: special ? colors.gold : colors.primary };
    }
    marks[selected] = { ...(marks[selected] ?? {}), selected: true, selectedColor: colors.primary };
    return marks;
  }, [visibleMonth, selected, colors, content]);

  const selectedDate = parseDateKey(selected);
  const selectedEvents = eventsOn(selectedDate);

  const upcomingSpecials = allSpecialEvents().filter((e) => parseDateKey(e.date) >= parseDateKey(dateKey(now)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const addNext = () => {
    if (!next) return;
    addToPhoneCalendar(next.event, next.date, !next.special);
  };

  const renderOccurrence = (occ: Occurrence) => (
    <View key={`${occ.event.id}-${occ.date.getTime()}`} style={styles.dayEvent}>
      <View style={[styles.dayEventBar, occ.special && { backgroundColor: colors.gold }]} />
      <View style={styles.dayEventInfo}>
        <Text style={styles.dayEventTime}>{occ.event.startTime}</Text>
        <Text style={styles.dayEventTitle}>{occ.event.title}</Text>
        <Text style={styles.dayEventDesc}>{occ.event.description}</Text>
      </View>
      <TouchableOpacity
        onPress={() => addToPhoneCalendar(occ.event, occ.date, false)}
        hitSlop={8}
        accessibilityLabel="Adicionar à agenda"
      >
        <Ionicons name="calendar-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Programação" subtitle="Cultos e eventos · Trindade-GO" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Destaque: acontecendo agora, ou contagem para o próximo. */}
        {live ? (
          <View style={[styles.hero, styles.heroLive]}>
            <View style={styles.heroTop}>
              <View style={styles.liveDot} />
              <Text style={styles.heroLabel}>ACONTECENDO AGORA</Text>
            </View>
            <Text style={styles.heroTitle}>{live.title}</Text>
            <Text style={styles.heroWhen}>Começou às {live.startTime}</Text>
            <TouchableOpacity style={styles.heroButton} onPress={() => Linking.openURL(CHURCH_INFO.youtubeLive)}>
              <Ionicons name="logo-youtube" size={18} color="#C62828" />
              <Text style={[styles.heroButtonText, { color: '#C62828' }]}>Assistir ao vivo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          next &&
          left && (
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{next.special ? 'PRÓXIMO EVENTO' : 'PRÓXIMO CULTO'}</Text>
              <Text style={styles.heroTitle}>{next.event.title}</Text>
              <Text style={styles.heroWhen}>
                {describeDay(next.date, now)} · {next.event.startTime}
              </Text>
              <View style={styles.countRow}>
                {[
                  { v: left.d, l: left.d === 1 ? 'dia' : 'dias' },
                  { v: left.h, l: 'horas' },
                  { v: left.m, l: 'min' },
                ].map((c) => (
                  <View key={c.l} style={styles.countBox}>
                    <Text style={styles.countValue}>{String(c.v).padStart(2, '0')}</Text>
                    <Text style={styles.countLabel}>{c.l}</Text>
                  </View>
                ))}
              </View>
            </View>
          )
        )}

        <View style={styles.actions}>
          {[
            { icon: 'calendar' as const, label: 'Agenda', onPress: addNext },
            { icon: 'share-social' as const, label: 'Convidar', onPress: shareInvite },
            { icon: 'navigate' as const, label: 'Como chegar', onPress: openChurchMap },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.action} onPress={a.onPress}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Cultos semanais" inset={0} />
        {WEEKLY_EVENTS.slice()
          .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
          .map((event) => (
            <View key={event.id} style={styles.weekly}>
              <View style={styles.weeklyDay}>
                <Text style={styles.weeklyDayText}>{DAYS_SHORT[event.day]}</Text>
                <Text style={styles.weeklyTime}>{event.startTime}</Text>
              </View>
              <View style={styles.weeklyInfo}>
                <Text style={styles.weeklyTitle}>{event.title}</Text>
                <Text style={styles.weeklyDesc}>{event.description}</Text>
                <Text style={styles.weeklyMeta}>Toda {DAYS[event.day].toLowerCase()} · {event.location}</Text>
              </View>
              <TouchableOpacity
                style={styles.weeklyAdd}
                onPress={() => addToPhoneCalendar(event, nextDateOf(event, now), true)}
                accessibilityLabel={`Adicionar ${event.title} à agenda, toda semana`}
              >
                <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}

        {upcomingSpecials.length > 0 && (
          <>
            <SectionHeader title="Eventos especiais" accent={colors.gold} inset={0} />
            {upcomingSpecials.map((e) => {
              const d = parseDateKey(e.date);
              return (
                <TouchableOpacity key={e.id} style={styles.special} onPress={() => setSelected(e.date)}>
                  <View style={styles.specialDate}>
                    <Text style={styles.specialDay}>{d.getDate()}</Text>
                    <Text style={styles.specialMonth}>
                      {MONTHS_SHORT[d.getMonth()].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.weeklyInfo}>
                    <Text style={styles.weeklyTitle}>{e.title}</Text>
                    <Text style={styles.weeklyMeta}>
                      {DAYS[d.getDay()]} · {e.startTime} · {e.location}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <SectionHeader title="Calendário" inset={0} />
        <View style={styles.calendarCard}>
          <Calendar
            // Remonta ao trocar o tema: o componente guarda os estilos internamente.
            key={isDark ? 'dark' : 'light'}
            current={selected}
            onDayPress={(d: DateData) => setSelected(d.dateString)}
            onMonthChange={(d: DateData) => setVisibleMonth({ year: d.year, month: d.month - 1 })}
            markedDates={markedDates}
            firstDay={0}
            enableSwipeMonths
            theme={{
              calendarBackground: colors.card,
              textSectionTitleColor: colors.textLight,
              dayTextColor: colors.text,
              todayTextColor: colors.primary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.white,
              textDisabledColor: colors.border,
              monthTextColor: colors.text,
              arrowColor: colors.primary,
              dotColor: colors.primary,
              selectedDotColor: colors.white,
              textDayFontFamily: FONTS.regular.fontFamily,
              textMonthFontFamily: FONTS.bold.fontFamily,
              textDayHeaderFontFamily: FONTS.mono.fontFamily,
              textMonthFontSize: 17,
            }}
          />
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Culto</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.gold, marginLeft: 16 }]} />
            <Text style={styles.legendText}>Evento especial</Text>
          </View>
        </View>

        <Text style={styles.dayHeading}>{describeDay(selectedDate, now)}</Text>
        {selectedEvents.length > 0 ? (
          selectedEvents.map(renderOccurrence)
        ) : (
          <View style={styles.empty}>
            <Ionicons name="moon-outline" size={22} color={colors.gray} />
            <Text style={styles.emptyText}>Sem programação neste dia.</Text>
          </View>
        )}

        <SectionHeader title="Visite-nos" inset={0} />
        <ChurchContactCard />
      </ScrollView>
    </View>
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
      paddingBottom: 32,
    },
    hero: {
      backgroundColor: c.primary,
      borderRadius: SIZES.radius + 4,
      padding: 18,
    },
    heroLive: {
      backgroundColor: '#C62828',
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#fff',
    },
    heroLabel: {
      ...FONTS.mono,
      fontSize: 11,
      letterSpacing: 1,
      color: '#ffffffCC',
    },
    heroTitle: {
      ...FONTS.bold,
      fontSize: SIZES.extraLarge,
      color: '#fff',
      marginTop: 4,
    },
    heroWhen: {
      ...FONTS.regular,
      fontSize: SIZES.font,
      color: '#ffffffDD',
      marginTop: 2,
    },
    heroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      backgroundColor: '#fff',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
      marginTop: 14,
    },
    heroButtonText: {
      ...FONTS.bold,
      fontSize: SIZES.font,
    },
    countRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    countBox: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: SIZES.radius,
      paddingVertical: 10,
    },
    countValue: {
      ...FONTS.bold,
      fontSize: 28,
      color: '#fff',
    },
    countLabel: {
      ...FONTS.mono,
      fontSize: 11,
      color: '#ffffffCC',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    action: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    actionIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionText: {
      ...FONTS.medium,
      fontSize: SIZES.small,
      color: c.text,
      marginTop: 6,
    },
    weekly: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    weeklyDay: {
      width: 64,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: c.primary,
      marginRight: 12,
    },
    weeklyDayText: {
      ...FONTS.mono,
      fontSize: 12,
      color: '#ffffffCC',
    },
    weeklyTime: {
      ...FONTS.bold,
      fontSize: SIZES.large,
      color: '#fff',
    },
    weeklyInfo: {
      flex: 1,
    },
    weeklyTitle: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.text,
    },
    weeklyDesc: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    weeklyMeta: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
      marginTop: 4,
    },
    weeklyAdd: {
      paddingLeft: 8,
    },
    special: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.gold,
    },
    specialDate: {
      width: 52,
      alignItems: 'center',
      marginRight: 12,
    },
    specialDay: {
      ...FONTS.bold,
      fontSize: 26,
      color: c.gold,
    },
    specialMonth: {
      ...FONTS.mono,
      fontSize: 11,
      color: c.textLight,
    },
    calendarCard: {
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      paddingBottom: 10,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    legendText: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
    },
    dayHeading: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.text,
      marginTop: 16,
      marginBottom: 8,
    },
    dayEvent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
      paddingRight: 14,
    },
    dayEventBar: {
      width: 4,
      alignSelf: 'stretch',
      backgroundColor: c.primary,
    },
    dayEventInfo: {
      flex: 1,
      padding: 12,
    },
    dayEventTime: {
      ...FONTS.mono,
      fontSize: SIZES.small,
      color: c.primary,
    },
    dayEventTitle: {
      ...FONTS.bold,
      fontSize: SIZES.medium,
      color: c.text,
      marginTop: 2,
    },
    dayEventDesc: {
      ...FONTS.regular,
      fontSize: SIZES.small,
      color: c.textLight,
      marginTop: 2,
    },
    empty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: SIZES.radius,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyText: {
      ...FONTS.regular,
      fontSize: SIZES.font,
      color: c.textLight,
    },
  });

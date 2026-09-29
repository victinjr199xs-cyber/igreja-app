import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, FONTS, Palette } from '../constants/theme';
import { useThemedStyles } from '../context/SettingsContext';
import ScreenHeader from '../components/ScreenHeader';
import { WEEKLY_EVENTS, ChurchEvent } from '../data/churchData';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const eventColors = (c: Palette): Record<ChurchEvent['type'], string> => ({
  culto: c.primary,
  estudo: '#6B7A58',
  reuniao: c.gold,
  evento: '#7A6A8B',
});

const EVENT_ICONS: Record<ChurchEvent['type'], keyof typeof Ionicons.glyphMap> = {
  culto: 'heart',
  estudo: 'book',
  reuniao: 'people',
  evento: 'star',
};

export default function CalendarScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const EVENT_COLORS = eventColors(colors);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const getWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        dayNumber: date.getDate(),
        dayName: DAYS_OF_WEEK[i],
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  };

  const weekDates = getWeekDates();

  const getEventsForDay = (day: number): ChurchEvent[] => {
    return WEEKLY_EVENTS.filter((event) => event.day === day);
  };

  const selectedEvents = getEventsForDay(selectedDay);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Programação" subtitle="Cultos da semana · Trindade-GO" />

      <View style={styles.weekContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {weekDates.map((date, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCard,
                selectedDay === index && styles.dayCardSelected,
                date.isToday && styles.dayCardToday,
              ]}
              onPress={() => setSelectedDay(index)}
            >
              <Text
                style={[
                  styles.dayName,
                  selectedDay === index && styles.dayNameSelected,
                ]}
              >
                {date.dayName}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  selectedDay === index && styles.dayNumberSelected,
                  date.isToday && styles.dayNumberToday,
                ]}
              >
                {date.dayNumber}
              </Text>
              {getEventsForDay(index).length > 0 && (
                <View
                  style={[
                    styles.eventDot,
                    selectedDay === index && styles.eventDotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{DAYS_FULL[selectedDay]}</Text>
        <Text style={styles.eventCount}>
          {selectedEvents.length} {selectedEvents.length === 1 ? 'evento' : 'eventos'}
        </Text>
      </View>

      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        {selectedEvents.length > 0 ? (
          selectedEvents.map((event) => (
            <TouchableOpacity key={event.id} style={styles.eventCard}>
              <View style={[styles.eventTypeBar, { backgroundColor: EVENT_COLORS[event.type] }]} />
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <View style={[styles.eventIconContainer, { backgroundColor: EVENT_COLORS[event.type] + '20' }]}>
                    <Ionicons
                      name={EVENT_ICONS[event.type]}
                      size={20}
                      color={EVENT_COLORS[event.type]}
                    />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventType}>
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventDescription}>{event.description}</Text>
                <View style={styles.eventFooter}>
                  <View style={styles.eventDetail}>
                    <Ionicons name="time-outline" size={14} color={colors.textLight} />
                    <Text style={styles.eventDetailText}>
                      {event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime}
                    </Text>
                  </View>
                  <View style={styles.eventDetail}>
                    <Ionicons name="location-outline" size={14} color={colors.textLight} />
                    <Text style={styles.eventDetailText}>{event.location}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.border} />
            <Text style={styles.emptyTitle}>Nenhum evento</Text>
            <Text style={styles.emptyText}>Não há programação para este dia.</Text>
          </View>
        )}
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
  weekContainer: {
    backgroundColor: c.card,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  dayCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 56,
  },
  dayCardSelected: {
    backgroundColor: c.primary,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: c.secondary,
  },
  dayName: {
    fontSize: SIZES.small,
    color: c.textLight,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: c.white,
  },
  dayNumber: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: c.text,
  },
  dayNumberSelected: {
    color: c.white,
  },
  dayNumberToday: {
    color: c.secondary,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.secondary,
    marginTop: 4,
  },
  eventDotSelected: {
    backgroundColor: c.card,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 16,
  },
  dayTitle: {
    fontSize: SIZES.extraLarge,
    fontWeight: '700',
    color: c.text,
  },
  eventCount: {
    fontSize: SIZES.font,
    color: c.textLight,
  },
  eventsList: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: SIZES.radius,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventTypeBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: SIZES.medium,
    fontWeight: '700',
    color: c.text,
  },
  eventType: {
    fontSize: SIZES.small,
    color: c.textLight,
    marginTop: 2,
  },
  eventDescription: {
    fontSize: SIZES.font,
    color: c.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetailText: {
    fontSize: SIZES.small,
    color: c.textLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: SIZES.large,
    fontWeight: '600',
    color: c.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: SIZES.font,
    color: c.textLight,
    marginTop: 8,
  },
});

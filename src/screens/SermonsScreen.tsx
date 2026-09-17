import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Modal,
  Dimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { SERMONS, Sermon } from '../data/churchData';

const { width } = Dimensions.get('window');

export default function SermonsScreen() {
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // A fonte muda quando outra pregação é selecionada; o setup inicia a reprodução.
  const player = useVideoPlayer(selectedSermon?.videoUrl ?? null, (p) => {
    p.play();
  });

  const playSermon = (sermon: Sermon) => {
    setSelectedSermon(sermon);
    setModalVisible(true);
  };

  const closePlayer = () => {
    player.pause();
    setModalVisible(false);
  };

  const renderSermon = ({ item }: { item: Sermon }) => (
    <TouchableOpacity style={styles.sermonCard} onPress={() => playSermon(item)}>
      <View style={styles.thumbnailContainer}>
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="play-circle" size={48} color={COLORS.white} />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      <View style={styles.sermonInfo}>
        <Text style={styles.sermonTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.sermonPreacher}>{item.preacher}</Text>
        <View style={styles.sermonMeta}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textLight} />
          <Text style={styles.sermonDate}>{item.date}</Text>
        </View>
        <Text style={styles.sermonDescription} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pregações</Text>
          <Text style={styles.headerSubtitle}>Assista às ministrações</Text>
        </View>
        <Ionicons name="search-outline" size={24} color={COLORS.white} />
      </View>

      <View style={styles.latestSection}>
        <Text style={styles.sectionTitle}>Última Pregação</Text>
        <TouchableOpacity
          style={styles.latestCard}
          onPress={() => playSermon(SERMONS[0])}
        >
          <View style={styles.latestThumbnail}>
            <Ionicons name="play-circle" size={64} color={COLORS.white} />
            <View style={styles.latestDurationBadge}>
              <Text style={styles.durationText}>{SERMONS[0].duration}</Text>
            </View>
          </View>
          <View style={styles.latestInfo}>
            <Text style={styles.latestTitle}>{SERMONS[0].title}</Text>
            <Text style={styles.latestPreacher}>{SERMONS[0].preacher}</Text>
            <Text style={styles.latestDate}>{SERMONS[0].date}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Todas as Pregações</Text>
        <FlatList
          data={SERMONS}
          renderItem={renderSermon}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closePlayer}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closePlayer}
            >
              <Ionicons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedSermon?.title}
            </Text>
          </View>

          {selectedSermon && (
            <>
              <VideoView
                player={player}
                style={styles.video}
                nativeControls
                contentFit="contain"
              />
              <View style={styles.modalInfo}>
                <Text style={styles.modalSermonTitle}>{selectedSermon.title}</Text>
                <Text style={styles.modalPreacher}>{selectedSermon.preacher}</Text>
                <View style={styles.modalMeta}>
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textLight} />
                    <Text style={styles.modalMetaText}>{selectedSermon.date}</Text>
                  </View>
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                    <Text style={styles.modalMetaText}>{selectedSermon.duration}</Text>
                  </View>
                </View>
                <Text style={styles.modalDescription}>{selectedSermon.description}</Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.font,
    color: COLORS.white + 'CC',
    marginTop: 4,
  },
  latestSection: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  latestCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  latestThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  latestDurationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.black + 'AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  latestInfo: {
    padding: 16,
  },
  latestTitle: {
    fontSize: SIZES.extraLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  latestPreacher: {
    fontSize: SIZES.medium,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  latestDate: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
    marginTop: 4,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  listContent: {
    paddingBottom: 20,
  },
  sermonCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.black + 'AA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sermonInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  sermonTitle: {
    fontSize: SIZES.medium,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sermonPreacher: {
    fontSize: SIZES.font,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  sermonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sermonDate: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
  },
  sermonDescription: {
    fontSize: SIZES.small,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.primary,
  },
  closeButton: {
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.white,
  },
  video: {
    width: '100%',
    height: width * 0.56,
    backgroundColor: COLORS.black,
  },
  modalInfo: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
  },
  modalSermonTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalPreacher: {
    fontSize: SIZES.medium,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  modalMeta: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalMetaText: {
    fontSize: SIZES.font,
    color: COLORS.textLight,
  },
  modalDescription: {
    fontSize: SIZES.medium,
    color: COLORS.text,
    lineHeight: 24,
    marginTop: 16,
  },
});

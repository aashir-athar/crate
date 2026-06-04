import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { EmptyState } from '@/components/EmptyState';
import { TrackRow } from '@/components/TrackRow';
import { TrackRowSkeleton } from '@/components/TrackRowSkeleton';
import { useLibraryVersion } from '@/db/reactivity';
import { getAllTracks, type TrackSort } from '@/db/repositories/tracksRepo';
import { usePlayer } from '@/player/playerStore';
import { useSync } from '@/sync/syncStore';
import { hitSlop } from '@/theme/tokens';
import type { Track } from '@/types/models';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const SORTS: { key: TrackSort; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
];

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  chipStyles.useVariants({ active });
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={chipStyles.chip}
    >
      <Text variant="footnote" weight="medium" style={chipStyles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const version = useLibraryVersion();
  const [sort, setSort] = useState<TrackSort>('recent');

  const tracks = useMemo<Track[]>(() => getAllTracks(sort), [sort, version]);
  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const activeId = usePlayer((s) => s.currentTrackId);
  const setQueueAndPlay = usePlayer((s) => s.setQueueAndPlay);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const isSyncing = useSync((s) => Object.values(s.active).some(Boolean));

  const shuffleAll = () => {
    if (trackIds.length === 0) return;
    setQueueAndPlay(trackIds, 0);
    toggleShuffle();
  };

  const showSkeleton = tracks.length === 0 && isSyncing;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text variant="largeTitle">Library</Text>
        <View style={styles.actions}>
          <RoundIconButton
            name="shuffle"
            accessibilityLabel="Shuffle all"
            onPress={shuffleAll}
            disabled={trackIds.length === 0}
          />
          <RoundIconButton
            name="add"
            accessibilityLabel="Import a playlist"
            variant="filled"
            onPress={() => router.push('/import')}
          />
        </View>
      </View>

      <View style={styles.chips}>
        {SORTS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={sort === option.key}
            onPress={() => setSort(option.key)}
          />
        ))}
      </View>

      {showSkeleton ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 8 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </View>
      ) : tracks.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title="Your crate is empty"
          message="Paste a Jamendo, Internet Archive, or Audius playlist link to download music you can keep offline."
          actionLabel="Import a playlist"
          onAction={() => router.push('/import')}
        />
      ) : (
        <FlashList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackRow
              track={item}
              isActive={item.id === activeId}
              onPress={() => setQueueAndPlay(trackIds, index)}
              onLongPress={() => router.push({ pathname: '/track/[id]', params: { id: item.id } })}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  chips: {
    flexDirection: 'row',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  skeletonList: { paddingTop: theme.space.sm },
  listContent: { paddingBottom: 160 },
}));

const chipStyles = StyleSheet.create((theme) => ({
  chip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.round,
    variants: {
      active: {
        true: { backgroundColor: theme.colors.accent },
        false: { backgroundColor: theme.colors.surfaceElevated },
      },
    },
  },
  label: {
    variants: {
      active: {
        true: { color: theme.colors.onAccent },
        false: { color: theme.colors.textSecondary },
      },
    },
  },
}));

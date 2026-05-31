import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { useLibraryVersion } from '@/db/reactivity';
import { getTrackById } from '@/db/repositories/tracksRepo';
import { usePlayer } from '@/player/playerStore';
import type { Track } from '@/types/models';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type QueueItem = { id: string; index: number; track: Track };

export default function QueueScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const version = useLibraryVersion();

  const queueTrackIds = usePlayer((s) => s.queueTrackIds);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const jumpTo = usePlayer((s) => s.jumpTo);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);
  const clearQueue = usePlayer((s) => s.clearQueue);

  const items = useMemo<QueueItem[]>(
    () =>
      queueTrackIds
        .map((id, index) => ({ id, index, track: getTrackById(id) }))
        .filter((entry): entry is QueueItem => entry.track !== null),
    [queueTrackIds, version],
  );

  return (
    <Screen topInset>
      <View style={styles.header}>
        <RoundIconButton name="chevron-down" accessibilityLabel="Close" onPress={() => router.back()} />
        <Text variant="title">Queue</Text>
        <RoundIconButton
          name="trash-outline"
          accessibilityLabel="Clear queue"
          onPress={clearQueue}
          disabled={items.length === 0}
        />
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="list-outline"
          title="Queue is empty"
          message="Play something from your library to build a queue."
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => `${item.id}:${item.index}`}
          renderItem={({ item }) => {
            const active = item.index === currentIndex;
            return (
              <Pressable
                onPress={() => jumpTo(item.index)}
                accessibilityRole="button"
                accessibilityLabel={`${item.track.title} by ${item.track.artist ?? 'Unknown artist'}${
                  active ? ', now playing' : ''
                }`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Artwork url={item.track.artworkUrl} size={44} />
                <View style={styles.meta}>
                  <Text variant="callout" numberOfLines={1} color={active ? 'accent' : 'primary'}>
                    {item.track.title}
                  </Text>
                  <Text variant="caption" color="secondary" numberOfLines={1}>
                    {item.track.artist ?? 'Unknown artist'}
                  </Text>
                </View>
                {active ? (
                  <Ionicons name="volume-medium" size={18} color={theme.colors.accent} />
                ) : (
                  <RoundIconButton
                    name="remove-circle-outline"
                    accessibilityLabel="Remove from queue"
                    onPress={() => removeFromQueue(item.index)}
                    size={20}
                  />
                )}
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
    paddingVertical: theme.space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  pressed: { backgroundColor: theme.colors.surface },
  meta: { flex: 1 },
}));

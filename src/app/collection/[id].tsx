import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { SourceBadge } from '@/components/SourceBadge';
import { TrackRow } from '@/components/TrackRow';
import { bumpLibrary, useLibraryVersion } from '@/db/reactivity';
import { getCollectionById, setAutoSync } from '@/db/repositories/collectionsRepo';
import { getTracksByCollection } from '@/db/repositories/tracksRepo';
import { downloadCollection } from '@/download/downloadManager';
import { usePlayer } from '@/player/playerStore';
import { removeCollection, syncCollection } from '@/sync/syncEngine';
import { useSync } from '@/sync/syncStore';
import { Button } from '@/ui/Button';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const version = useLibraryVersion();

  const collection = useMemo(() => (id ? getCollectionById(id) : null), [id, version]);
  const tracks = useMemo(() => (id ? getTracksByCollection(id) : []), [id, version]);
  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);

  const syncing = useSync((s) => (id ? Boolean(s.active[id]) : false));
  const diff = useSync((s) => (id ? s.lastDiff[id] : undefined));
  const setQueueAndPlay = usePlayer((s) => s.setQueueAndPlay);
  const activeId = usePlayer((s) => s.currentTrackId);

  if (!id || !collection) {
    return (
      <Screen topInset>
        <View style={styles.topBar}>
          <RoundIconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
        <EmptyState icon="alert-circle-outline" title="Crate not found" message="This crate may have been removed." />
      </Screen>
    );
  }

  const remaining = tracks.filter((t) => t.isDownloadable === 1 && t.downloadState !== 'downloaded').length;

  const onSync = async () => {
    try {
      await syncCollection(id);
    } catch (err) {
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Could not sync this crate.');
    }
  };

  const onDownloadAll = () => {
    const count = downloadCollection(id);
    if (count === 0) {
      Alert.alert('All set', 'Every downloadable track is already on your device.');
    }
  };

  const onToggleAutoSync = () => {
    setAutoSync(id, collection.autoSync !== 1);
    bumpLibrary();
  };

  const onRemove = () => {
    Alert.alert('Remove crate', `Delete "${collection.title}" and its downloaded files?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeCollection(id);
          router.back();
        },
      },
    ]);
  };

  const Header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <Artwork url={collection.artworkUrl} size={120} radius={16} />
        <View style={styles.heroMeta}>
          <Text variant="title" numberOfLines={2}>
            {collection.title}
          </Text>
          <SourceBadge source={collection.sourceKind} />
          <Text variant="footnote" color="secondary">
            {collection.downloadedCount} of {collection.trackCount} downloaded
          </Text>
          {diff && (diff.added.length > 0 || diff.removed.length > 0) ? (
            <Text variant="caption" color="tertiary">
              Last sync: +{diff.added.length} added, -{diff.removed.length} removed
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionFill}>
          <Button
            title="Play"
            onPress={() => trackIds.length > 0 && setQueueAndPlay(trackIds, 0)}
            disabled={trackIds.length === 0}
            fullWidth
          />
        </View>
        <RoundIconButton
          name="download-outline"
          accessibilityLabel="Download all"
          variant="filled"
          onPress={onDownloadAll}
          disabled={remaining === 0}
        />
        <RoundIconButton
          name="sync"
          accessibilityLabel="Sync now"
          variant="filled"
          onPress={() => void onSync()}
          disabled={syncing}
        />
      </View>

      <View style={styles.autoRow}>
        <Text variant="footnote" color="secondary">
          {syncing ? 'Syncing…' : `Auto-sync ${collection.autoSync === 1 ? 'on' : 'off'}`}
        </Text>
        <RoundIconButton
          name={collection.autoSync === 1 ? 'notifications' : 'notifications-off-outline'}
          accessibilityLabel="Toggle auto-sync"
          onPress={onToggleAutoSync}
          size={20}
        />
      </View>
    </View>
  );

  return (
    <Screen topInset>
      <View style={styles.topBar}>
        <RoundIconButton name="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        <RoundIconButton name="trash-outline" accessibilityLabel="Remove crate" onPress={onRemove} />
      </View>
      <FlashList
        data={tracks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            isActive={item.id === activeId}
            onPress={() => setQueueAndPlay(trackIds, index)}
            onLongPress={() => router.push({ pathname: '/track/[id]', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  header: { paddingBottom: theme.space.md, gap: theme.space.lg },
  hero: {
    flexDirection: 'row',
    gap: theme.space.lg,
    paddingHorizontal: theme.space.lg,
    alignItems: 'center',
  },
  heroMeta: { flex: 1, gap: theme.space.xs },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  actionFill: { flex: 1 },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
  },
}));

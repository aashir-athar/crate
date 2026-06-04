import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { SOURCE_LABELS } from '@/constants/sources';
import { formatRelativeTime } from '@/lib/format';
import { useSync } from '@/sync/syncStore';
import type { Collection } from '@/types/models';
import { Text } from '@/ui/Text';

import { Artwork } from './Artwork';
import { SourceBadge } from './SourceBadge';

type Props = {
  collection: Collection;
  onPress: () => void;
};

export function CollectionCard({ collection, onPress }: Props) {
  const { theme } = useUnistyles();
  const syncing = useSync((s) => s.active[collection.id]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${collection.title}, ${SOURCE_LABELS[collection.sourceKind]} crate, ${collection.downloadedCount} of ${collection.trackCount} downloaded`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Artwork url={collection.artworkUrl} size={64} radius={12} />
      <View style={styles.meta}>
        <Text variant="headline" numberOfLines={1}>
          {collection.title}
        </Text>
        <SourceBadge source={collection.sourceKind} />
        <Text variant="footnote" color="secondary">
          {collection.downloadedCount} of {collection.trackCount} downloaded
        </Text>
        <Text variant="caption" color="tertiary">
          {syncing ? 'Syncing…' : `Synced ${formatRelativeTime(collection.lastSyncedAt)}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  pressed: { backgroundColor: theme.colors.surface },
  meta: { flex: 1, gap: theme.space.xs },
}));

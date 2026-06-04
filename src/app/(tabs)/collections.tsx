import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { CollectionCard } from '@/components/CollectionCard';
import { EmptyState } from '@/components/EmptyState';
import { useLibraryVersion } from '@/db/reactivity';
import { getAllCollections } from '@/db/repositories/collectionsRepo';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const version = useLibraryVersion();
  const collections = useMemo(() => getAllCollections(), [version]);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text variant="largeTitle">Crates</Text>
        <RoundIconButton
          name="add"
          accessibilityLabel="Import a playlist"
          variant="filled"
          onPress={() => router.push('/import')}
        />
      </View>

      {collections.length === 0 ? (
        <EmptyState
          icon="file-tray-stacked-outline"
          title="No crates yet"
          message="A crate is a playlist or album you've imported. Add one to start building your offline collection."
          actionLabel="Import a playlist"
          onAction={() => router.push('/import')}
        />
      ) : (
        <FlashList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CollectionCard
              collection={item}
              onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item.id } })}
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
  listContent: { paddingBottom: 160 },
}));

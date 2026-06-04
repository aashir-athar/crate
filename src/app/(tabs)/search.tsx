import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { SourceBadge } from '@/components/SourceBadge';
import { TrackRowSkeleton } from '@/components/TrackRowSkeleton';
import { getAdapter } from '@/sources/registry';
import type { SearchResult } from '@/sources/types';
import { importSearchResult } from '@/sync/syncEngine';
import { hitSlop } from '@/theme/tokens';
import type { SourceKind } from '@/types/models';
import { Text } from '@/ui/Text';
import { Screen } from '@/ui/Screen';

type SearchSource = Extract<SourceKind, 'jamendo' | 'internet_archive'>;

const SEARCH_SOURCES: { key: SearchSource; label: string }[] = [
  { key: 'internet_archive', label: 'Internet Archive' },
  { key: 'jamendo', label: 'Jamendo' },
];

function ResultRow({
  result,
  importing,
  onPress,
}: {
  result: SearchResult;
  importing: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={importing}
      accessibilityRole="button"
      accessibilityLabel={`Import ${result.title}${result.subtitle ? ` by ${result.subtitle}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Artwork url={result.artworkUrl} size={48} />
      <View style={styles.meta}>
        <Text variant="callout" numberOfLines={1}>
          {result.title}
        </Text>
        {result.subtitle ? (
          <Text variant="footnote" color="secondary" numberOfLines={1}>
            {result.subtitle}
          </Text>
        ) : null}
        <SourceBadge source={result.sourceKind} />
      </View>
      {importing ? (
        <Text variant="caption" color="secondary">
          Importing…
        </Text>
      ) : (
        <Ionicons name="add-circle-outline" size={24} color={theme.colors.accent} />
      )}
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [source, setSource] = useState<SearchSource>('internet_archive');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const enabled = debounced.length >= 2;
  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['search', source, debounced],
    queryFn: () => getAdapter(source).search(debounced),
    enabled,
  });

  const results = useMemo(() => data?.items ?? [], [data]);

  const onImport = async (result: SearchResult) => {
    if (importingId) return;
    setImportingId(result.id);
    try {
      const imported = await importSearchResult(result);
      router.push({ pathname: '/collection/[id]', params: { id: imported.collectionId } });
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text variant="largeTitle">Search</Text>
        <View style={styles.sources}>
          {SEARCH_SOURCES.map((item) => {
            const active = item.key === source;
            return (
              <Pressable
                key={item.key}
                onPress={() => setSource(item.key)}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.sourceChip, active && styles.sourceChipActive]}
              >
                <Text variant="footnote" weight="medium" color={active ? 'onAccent' : 'secondary'}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search playlists and albums"
            placeholderTextColor={theme.colors.textTertiary}
            style={styles.input}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={theme.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!enabled ? (
        <EmptyState
          icon="search-outline"
          title="Find music to keep"
          message="Search a source for Creative Commons and public-domain playlists, then import them to download offline."
        />
      ) : isFetching ? (
        <View>
          {Array.from({ length: 8 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Search unavailable"
          message={error instanceof Error ? error.message : 'Could not reach this source. Try again.'}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="sad-outline"
          title="No results"
          message={`Nothing found for "${debounced}". Try a different search or source.`}
        />
      ) : (
        <FlashList
          data={results}
          keyExtractor={(item) => `${item.sourceKind}:${item.id}`}
          renderItem={({ item }) => (
            <ResultRow
              result={item}
              importing={importingId === item.id}
              onPress={() => void onImport(item)}
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
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
    gap: theme.space.md,
  },
  sources: { flexDirection: 'row', gap: theme.space.sm },
  sourceChip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.surfaceElevated,
  },
  sourceChipActive: { backgroundColor: theme.colors.accent },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  input: { flex: 1, color: theme.colors.text, fontSize: theme.typography.size.body, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  rowPressed: { backgroundColor: theme.colors.surface },
  meta: { flex: 1, gap: theme.space.xs },
  listContent: { paddingBottom: 160 },
}));

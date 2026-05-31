import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { SourceBadge } from '@/components/SourceBadge';
import { TrackRowSkeleton } from '@/components/TrackRowSkeleton';
import { detectSourceFromUrl } from '@/sources/registry';
import type { ResolvedCollection } from '@/sources/types';
import { importResolved, previewUrl } from '@/sync/syncEngine';
import type { ResolvedTrack } from '@/types/models';
import { Button } from '@/ui/Button';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function PreviewTrackRow({ track }: { track: ResolvedTrack }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.previewRow}>
      <View style={styles.previewMeta}>
        <Text variant="footnote" numberOfLines={1}>
          {track.title}
        </Text>
        <Text variant="caption" color="tertiary" numberOfLines={1}>
          {track.artist ?? 'Unknown artist'}
        </Text>
      </View>
      <Ionicons
        name={track.isDownloadable ? 'arrow-down-circle' : 'cloud-outline'}
        size={18}
        color={track.isDownloadable ? theme.colors.accent : theme.colors.textTertiary}
      />
    </View>
  );
}

export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ResolvedCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void (async () => {
      const clip = await Clipboard.getStringAsync();
      if (clip && detectSourceFromUrl(clip)) setUrl(clip);
    })();
  }, []);

  const trimmed = url.trim();
  const adapter = detectSourceFromUrl(trimmed);

  const downloadableCount = useMemo(
    () => (preview ? preview.tracks.filter((t) => t.isDownloadable).length : 0),
    [preview],
  );

  const onPreview = async () => {
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await previewUrl(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that link.');
    } finally {
      setLoading(false);
    }
  };

  const onImport = () => {
    if (!preview) return;
    setImporting(true);
    try {
      const result = importResolved(preview);
      router.replace({ pathname: '/collection/[id]', params: { id: result.collectionId } });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Screen topInset>
      <View style={styles.header}>
        <Text variant="title">Import a crate</Text>
        <RoundIconButton name="close" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputBox}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="Paste a Jamendo, Internet Archive, or Audius link"
            placeholderTextColor={theme.colors.textTertiary}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
        </View>
        <View style={styles.detectRow}>
          {adapter ? (
            <SourceBadge source={adapter.kind} />
          ) : trimmed ? (
            <Text variant="caption" color="danger">
              Unsupported link. Use Jamendo, Internet Archive, or Audius.
            </Text>
          ) : (
            <Text variant="caption" color="tertiary">
              Public playlists and albums only.
            </Text>
          )}
        </View>
        <Button
          title={loading ? 'Reading…' : 'Preview'}
          onPress={onPreview}
          disabled={!adapter || loading}
          fullWidth
        />
      </View>

      {loading ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.message}>
          <Text variant="body" color="danger">
            {error}
          </Text>
        </View>
      ) : preview ? (
        <View style={styles.previewWrap}>
          <View style={styles.summary}>
            <Text variant="headline" numberOfLines={2}>
              {preview.title}
            </Text>
            <Text variant="footnote" color="secondary">
              {preview.tracks.length} tracks · {downloadableCount} downloadable
            </Text>
          </View>
          <FlashList
            data={preview.tracks}
            keyExtractor={(item, index) => `${item.sourceTrackId}:${index}`}
            renderItem={({ item }) => <PreviewTrackRow track={item} />}
            contentContainerStyle={styles.previewList}
          />
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Button
              title={
                importing
                  ? 'Importing…'
                  : downloadableCount > 0
                    ? `Import & download ${downloadableCount}`
                    : 'Import crate'
              }
              onPress={onImport}
              disabled={importing}
              fullWidth
            />
          </View>
        </View>
      ) : null}
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
  form: { paddingHorizontal: theme.space.lg, gap: theme.space.md },
  inputBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  input: { color: theme.colors.text, fontSize: theme.typography.size.body, minHeight: 44 },
  detectRow: { minHeight: 20, justifyContent: 'center' },
  message: { padding: theme.space.lg },
  previewWrap: { flex: 1, marginTop: theme.space.md },
  summary: { paddingHorizontal: theme.space.lg, paddingBottom: theme.space.sm, gap: 2 },
  previewList: { paddingBottom: theme.space.lg },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  previewMeta: { flex: 1 },
  footer: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
}));

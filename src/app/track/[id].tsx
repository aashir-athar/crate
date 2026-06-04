import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { LicenseBadge } from '@/components/LicenseBadge';
import { SourceBadge } from '@/components/SourceBadge';
import { useLibraryVersion } from '@/db/reactivity';
import { getTrackById } from '@/db/repositories/tracksRepo';
import {
  cancelDownload,
  deleteDownloadedFile,
  enqueueDownload,
  retryDownload,
} from '@/download/downloadManager';
import { useDownloads } from '@/download/downloadStore';
import { formatBytes, formatDuration } from '@/lib/format';
import { usePlayer } from '@/player/playerStore';
import type { DownloadState } from '@/types/models';
import { Button } from '@/ui/Button';
import { ProgressBar } from '@/ui/ProgressBar';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function TrackDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const version = useLibraryVersion();

  const track = useMemo(() => (id ? getTrackById(id) : null), [id, version]);
  const job = useDownloads((s) => (id ? s.jobs[id] : undefined));

  const setQueueAndPlay = usePlayer((s) => s.setQueueAndPlay);
  const playNext = usePlayer((s) => s.playNext);
  const addToQueue = usePlayer((s) => s.addToQueue);

  if (!id || !track) {
    return (
      <Screen topInset>
        <View style={styles.topBar}>
          <RoundIconButton name="chevron-down" accessibilityLabel="Close" onPress={() => router.back()} />
        </View>
        <EmptyState icon="alert-circle-outline" title="Track not found" message="This track may have been removed." />
      </Screen>
    );
  }

  const state: DownloadState = job?.state ?? track.downloadState;
  const downloadable = track.isDownloadable === 1;

  const renderDownloadSection = () => {
    if (state === 'downloading' || state === 'queued') {
      return (
        <View style={styles.downloadBox}>
          <ProgressBar ratio={job?.ratio ?? 0} />
          <Button title="Cancel download" variant="secondary" onPress={() => cancelDownload(id)} fullWidth />
        </View>
      );
    }
    if (state === 'downloaded') {
      return (
        <View style={styles.downloadBox}>
          <Text variant="footnote" color="secondary">
            Saved offline{track.fileSizeBytes ? ` · ${formatBytes(track.fileSizeBytes)}` : ''}
          </Text>
          <Button title="Delete download" variant="secondary" onPress={() => deleteDownloadedFile(id)} fullWidth />
        </View>
      );
    }
    if (state === 'error') {
      return (
        <View style={styles.downloadBox}>
          <Text variant="footnote" color="danger">
            {job?.error ?? 'Download failed.'}
          </Text>
          <Button title="Retry download" onPress={() => retryDownload(id)} fullWidth />
        </View>
      );
    }
    if (downloadable) {
      return <Button title="Download" onPress={() => enqueueDownload(track)} fullWidth />;
    }
    return (
      <Text variant="footnote" color="tertiary" style={styles.streamNote}>
        Stream only — this source does not allow saving this track offline.
      </Text>
    );
  };

  return (
    <Screen topInset>
      <View style={styles.topBar}>
        <RoundIconButton name="chevron-down" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <Artwork url={track.artworkUrl} size={160} radius={18} />
          <Text variant="title" style={styles.center} numberOfLines={2}>
            {track.title}
          </Text>
          <Text variant="callout" color="secondary" style={styles.center}>
            {track.artist ?? 'Unknown artist'}
          </Text>
          {track.album ? (
            <Text variant="footnote" color="tertiary" style={styles.center}>
              {track.album}
            </Text>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <SourceBadge source={track.sourceKind} />
          <Text variant="caption" color="tertiary">
            {formatDuration(track.durationSec)}
          </Text>
        </View>

        <LicenseBadge
          name={track.licenseName}
          nonCommercial={track.nonCommercial === 1}
          noDerivatives={track.noDerivatives === 1}
          shareAlike={track.shareAlike === 1}
        />

        <View style={styles.actions}>
          <Button title="Play" onPress={() => setQueueAndPlay([id], 0)} fullWidth />
          <View style={styles.secondaryRow}>
            <View style={styles.fill}>
              <Button title="Play next" variant="secondary" onPress={() => playNext(id)} fullWidth />
            </View>
            <View style={styles.fill}>
              <Button title="Add to queue" variant="secondary" onPress={() => addToQueue(id)} fullWidth />
            </View>
          </View>
        </View>

        <View style={styles.section}>{renderDownloadSection()}</View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  topBar: { paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm },
  content: { paddingHorizontal: theme.space.lg, gap: theme.space.lg, alignItems: 'stretch' },
  hero: { alignItems: 'center', gap: theme.space.xs, paddingVertical: theme.space.md },
  center: { textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { gap: theme.space.sm },
  secondaryRow: { flexDirection: 'row', gap: theme.space.sm },
  fill: { flex: 1 },
  section: { marginTop: theme.space.sm },
  downloadBox: { gap: theme.space.sm },
  streamNote: { textAlign: 'center' },
}));

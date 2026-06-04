import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { useLibraryVersion } from '@/db/reactivity';
import { getStorageStats, getTrackById } from '@/db/repositories/tracksRepo';
import { cancelDownload, retryDownload } from '@/download/downloadManager';
import { useDownloads } from '@/download/downloadStore';
import { formatBytes } from '@/lib/format';
import type { DownloadJob, Track } from '@/types/models';
import { ProgressBar } from '@/ui/ProgressBar';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function DownloadRow({ job, track }: { job: DownloadJob; track: Track }) {
  const isError = job.state === 'error';
  return (
    <View style={styles.row}>
      <Artwork url={track.artworkUrl} size={44} />
      <View style={styles.meta}>
        <Text variant="callout" numberOfLines={1}>
          {track.title}
        </Text>
        {isError ? (
          <Text variant="caption" color="danger" numberOfLines={1}>
            {job.error ?? 'Download failed'}
          </Text>
        ) : (
          <ProgressBar ratio={job.ratio} />
        )}
      </View>
      {isError ? (
        <RoundIconButton
          name="refresh"
          accessibilityLabel="Retry download"
          onPress={() => retryDownload(job.trackId)}
        />
      ) : (
        <RoundIconButton
          name="close"
          accessibilityLabel="Cancel download"
          onPress={() => cancelDownload(job.trackId)}
        />
      )}
    </View>
  );
}

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const jobs = useDownloads((s) => s.jobs);
  const version = useLibraryVersion();

  const activeJobs = useMemo(
    () =>
      Object.values(jobs)
        .filter((job) => job.state !== 'downloaded' && job.state !== 'remote')
        .map((job) => ({ job, track: getTrackById(job.trackId) }))
        .filter((entry): entry is { job: DownloadJob; track: Track } => entry.track !== null),
    [jobs, version],
  );

  const stats = useMemo(() => getStorageStats(), [version]);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text variant="largeTitle">Downloads</Text>
        <Text variant="footnote" color="secondary">
          {stats.count} {stats.count === 1 ? 'track' : 'tracks'} · {formatBytes(stats.bytes)} on device
        </Text>
      </View>

      {activeJobs.length === 0 ? (
        <EmptyState
          icon="cloud-download-outline"
          title="Nothing downloading"
          message="When you import or sync a crate, downloads appear here with live progress."
          actionLabel="Import a playlist"
          onAction={() => router.push('/import')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {activeJobs.map(({ job, track }) => (
            <DownloadRow key={job.trackId} job={job} track={track} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.md,
    gap: theme.space.xs,
  },
  listContent: { paddingBottom: 160 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  meta: { flex: 1, gap: theme.space.xs },
}));

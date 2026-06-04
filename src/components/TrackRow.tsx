import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useDownloads } from '@/download/downloadStore';
import { formatDuration } from '@/lib/format';
import type { DownloadState, Track } from '@/types/models';
import { ProgressBar } from '@/ui/ProgressBar';
import { Text } from '@/ui/Text';

import { Artwork } from './Artwork';

type Props = {
  track: Track;
  onPress: () => void;
  onLongPress?: () => void;
  isActive?: boolean;
};

const STATE_LABEL: Record<DownloadState, string> = {
  remote: 'not downloaded',
  queued: 'queued to download',
  downloading: 'downloading',
  downloaded: 'downloaded',
  paused: 'download paused',
  error: 'download failed',
};

function StatusIndicator({
  state,
  downloadable,
  accent,
  muted,
  danger,
}: {
  state: DownloadState;
  downloadable: boolean;
  accent: string;
  muted: string;
  danger: string;
}) {
  if (state === 'downloaded') {
    return <Ionicons name="checkmark-circle" size={18} color={accent} />;
  }
  if (state === 'error') {
    return <Ionicons name="alert-circle" size={18} color={danger} />;
  }
  if (state === 'paused') {
    return <Ionicons name="pause-circle" size={18} color={muted} />;
  }
  if (downloadable) {
    return <Ionicons name="arrow-down-circle-outline" size={18} color={muted} />;
  }
  return <Ionicons name="cloud-outline" size={18} color={muted} />;
}

function TrackRowImpl({ track, onPress, onLongPress, isActive = false }: Props) {
  const { theme } = useUnistyles();
  const job = useDownloads((s) => s.jobs[track.id]);
  const state: DownloadState = job?.state ?? track.downloadState;
  const inFlight = state === 'downloading' || state === 'queued';

  styles.useVariants({ active: isActive });

  const statusLabel = track.isDownloadable === 1 ? STATE_LABEL[state] : 'stream only';
  const a11yLabel = `${track.title}, ${track.artist ?? 'Unknown artist'}, ${statusLabel}${
    isActive ? ', now playing' : ''
  }`;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={
        onLongPress ? 'Plays this track. Long press for options.' : 'Plays this track.'
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Artwork url={track.artworkUrl} size={48} />
      <View style={styles.meta}>
        <Text variant="callout" numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>
        <Text variant="footnote" color="secondary" numberOfLines={1}>
          {track.artist ?? 'Unknown artist'}
        </Text>
      </View>
      <View style={styles.right}>
        {inFlight ? (
          <View style={styles.progress}>
            <ProgressBar ratio={job?.ratio ?? 0} />
          </View>
        ) : (
          <>
            <Text variant="caption" color="tertiary">
              {formatDuration(track.durationSec)}
            </Text>
            <StatusIndicator
              state={state}
              downloadable={track.isDownloadable === 1}
              accent={theme.colors.accent}
              muted={theme.colors.textTertiary}
              danger={theme.colors.danger}
            />
          </>
        )}
      </View>
    </Pressable>
  );
}

export const TrackRow = memo(TrackRowImpl);

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  pressed: { backgroundColor: theme.colors.surface },
  meta: { flex: 1 },
  title: {
    variants: {
      active: {
        true: { color: theme.colors.accent },
        false: { color: theme.colors.text },
      },
    },
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  progress: { width: 44 },
}));

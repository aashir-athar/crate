import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useLibraryVersion } from '@/db/reactivity';
import { getTrackById } from '@/db/repositories/tracksRepo';
import { clamp01 } from '@/lib/format';
import { usePlayer } from '@/player/playerStore';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Text } from '@/ui/Text';

import { Artwork } from './Artwork';

/**
 * Isolated so it is the ONLY thing subscribing to the ~2x/sec position updates.
 * Keeps the MiniPlayer parent from re-rendering its artwork/buttons every tick.
 */
function MiniPlayerProgress() {
  const positionSec = usePlayer((s) => s.positionSec);
  const durationSec = usePlayer((s) => s.durationSec);
  const ratio = durationSec > 0 ? clamp01(positionSec / durationSec) : 0;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

/** Persistent now-playing bar shown above the tab bar. Null when nothing is loaded. */
export function MiniPlayer() {
  const currentTrackId = usePlayer((s) => s.currentTrackId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const version = useLibraryVersion();

  const track = useMemo(
    () => (currentTrackId ? getTrackById(currentTrackId) : null),
    [currentTrackId, version],
  );

  if (!track) return null;

  return (
    <Pressable
      onPress={() => router.push('/player')}
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${track.title} by ${track.artist ?? 'Unknown artist'}. Open player.`}
      style={styles.container}
    >
      <MiniPlayerProgress />
      <View style={styles.inner}>
        <Artwork url={track.artworkUrl} size={40} radius={8} />
        <View style={styles.meta}>
          <Text variant="footnote" weight="semibold" numberOfLines={1}>
            {track.title}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {track.artist ?? 'Unknown artist'}
          </Text>
        </View>
        <RoundIconButton
          name={isPlaying ? 'pause' : 'play'}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={togglePlay}
        />
        <RoundIconButton name="play-skip-forward" accessibilityLabel="Next track" onPress={next} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginHorizontal: theme.space.sm,
  },
  progressTrack: {
    height: 2,
    backgroundColor: theme.colors.surfaceSunken,
  },
  progressFill: {
    height: 2,
    backgroundColor: theme.colors.accent,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  meta: { flex: 1 },
}));

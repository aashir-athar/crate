import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { LicenseBadge } from '@/components/LicenseBadge';
import { useLibraryVersion } from '@/db/reactivity';
import { getTrackById } from '@/db/repositories/tracksRepo';
import { formatDuration } from '@/lib/format';
import { usePlayer } from '@/player/playerStore';
import { RoundIconButton } from '@/ui/RoundIconButton';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function BigPlayButton({ isPlaying, onPress }: { isPlaying: boolean; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      style={({ pressed }) => [bp.button, pressed && bp.pressed]}
    >
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={theme.colors.onAccent} />
    </Pressable>
  );
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  const version = useLibraryVersion();

  const currentTrackId = usePlayer((s) => s.currentTrackId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const positionSec = usePlayer((s) => s.positionSec);
  const durationSec = usePlayer((s) => s.durationSec);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const seek = usePlayer((s) => s.seek);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);

  const [sliding, setSliding] = useState<number | null>(null);
  const track = useMemo(
    () => (currentTrackId ? getTrackById(currentTrackId) : null),
    [currentTrackId, version],
  );

  if (!track) {
    return (
      <Screen topInset>
        <View style={styles.topBar}>
          <RoundIconButton name="chevron-down" accessibilityLabel="Close" onPress={() => router.back()} />
        </View>
        <EmptyState
          icon="musical-notes-outline"
          title="Nothing playing"
          message="Pick a track from your library to start listening."
        />
      </Screen>
    );
  }

  const artworkSize = Math.min(width - 80, 340);
  const value = sliding ?? positionSec;
  const repeatActive = repeat !== 'off';

  return (
    <Screen topInset>
      <View style={styles.topBar}>
        <RoundIconButton name="chevron-down" accessibilityLabel="Close" onPress={() => router.back()} />
        <Text variant="footnote" color="secondary">
          Now Playing
        </Text>
        <RoundIconButton name="list" accessibilityLabel="Open queue" onPress={() => router.push('/queue')} />
      </View>

      <View style={styles.artwork}>
        <Artwork url={track.artworkUrl} size={artworkSize} radius={20} />
      </View>

      <View style={styles.info}>
        <Text variant="title" numberOfLines={2}>
          {track.title}
        </Text>
        <Text variant="callout" color="secondary" numberOfLines={1}>
          {track.artist ?? 'Unknown artist'}
        </Text>
        {track.album ? (
          <Text variant="footnote" color="tertiary" numberOfLines={1}>
            {track.album}
          </Text>
        ) : null}
        <View style={styles.license}>
          <LicenseBadge
            name={track.licenseName}
            nonCommercial={track.nonCommercial === 1}
            noDerivatives={track.noDerivatives === 1}
            shareAlike={track.shareAlike === 1}
          />
        </View>
      </View>

      <View style={styles.seek}>
        <Slider
          value={value}
          minimumValue={0}
          maximumValue={durationSec > 0 ? durationSec : 1}
          onValueChange={setSliding}
          onSlidingComplete={(v) => {
            seek(v);
            setSliding(null);
          }}
          minimumTrackTintColor={theme.colors.accent}
          maximumTrackTintColor={theme.colors.surfaceSunken}
          thumbTintColor={theme.colors.accent}
        />
        <View style={styles.times}>
          <Text variant="caption" color="tertiary">
            {formatDuration(value)}
          </Text>
          <Text variant="caption" color="tertiary">
            {formatDuration(durationSec)}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <RoundIconButton
          name="shuffle"
          accessibilityLabel={shuffle ? 'Shuffle on' : 'Shuffle off'}
          variant={shuffle ? 'accent' : 'plain'}
          onPress={toggleShuffle}
          size={20}
        />
        <RoundIconButton name="play-skip-back" accessibilityLabel="Previous" onPress={previous} size={28} />
        <BigPlayButton isPlaying={isPlaying} onPress={togglePlay} />
        <RoundIconButton name="play-skip-forward" accessibilityLabel="Next" onPress={next} size={28} />
        <RoundIconButton
          name="repeat"
          accessibilityLabel={`Repeat ${repeat}`}
          variant={repeatActive ? 'accent' : 'plain'}
          onPress={cycleRepeat}
          size={20}
        />
      </View>

      <View style={{ height: insets.bottom + 16 }} />
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
  artwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.lg,
  },
  info: {
    paddingHorizontal: theme.space.xl,
    gap: theme.space.xs,
    alignItems: 'center',
  },
  license: { marginTop: theme.space.sm },
  seek: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
  },
}));

const bp = StyleSheet.create((theme) => ({
  button: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.round,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
}));

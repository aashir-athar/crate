import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { clamp01 } from '@/lib/format';

type Props = {
  /** 0..1 */
  ratio: number;
  height?: number;
};

export function ProgressBar({ ratio, height = 4 }: Props) {
  const percent = `${Math.round(clamp01(ratio) * 100)}%` as const;
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: percent }]} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: {
    width: '100%',
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius: theme.radius.round,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.round,
  },
}));

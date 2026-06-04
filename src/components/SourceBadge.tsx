import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { SOURCE_ACCENTS, SOURCE_LABELS } from '@/constants/sources';
import type { SourceKind } from '@/types/models';
import { Text } from '@/ui/Text';

export function SourceBadge({ source }: { source: SourceKind }) {
  const accent = SOURCE_ACCENTS[source];
  return (
    <View style={[styles.badge, { backgroundColor: `${accent}22` }]}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text variant="caption" weight="semibold" style={{ color: accent }}>
        {SOURCE_LABELS[source]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
}));

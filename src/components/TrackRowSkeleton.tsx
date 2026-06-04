import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Skeleton } from '@/ui/Skeleton';

export function TrackRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={48} height={48} radius={10} />
      <View style={styles.meta}>
        <Skeleton width="68%" height={14} radius={6} />
        <Skeleton width="40%" height={11} radius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  },
  meta: {
    flex: 1,
    gap: theme.space.sm,
  },
}));

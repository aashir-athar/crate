import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Skeleton } from '@/ui/Skeleton';

export function CollectionCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={64} height={64} radius={12} />
      <View style={styles.meta}>
        <Skeleton width="70%" height={16} radius={6} />
        <Skeleton width="40%" height={12} radius={6} />
        <Skeleton width="55%" height={12} radius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  meta: { flex: 1, gap: theme.space.sm },
}));

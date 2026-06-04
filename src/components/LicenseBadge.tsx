import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Badge } from '@/ui/Badge';

type Props = {
  name: string | null;
  nonCommercial?: boolean;
  noDerivatives?: boolean;
  shareAlike?: boolean;
};

/** Surfaces the Creative Commons license + its restriction tags for attribution. */
export function LicenseBadge({ name, nonCommercial, noDerivatives, shareAlike }: Props) {
  if (!name) return null;
  return (
    <View style={styles.row}>
      <Badge label={name} tone="neutral" />
      {nonCommercial ? <Badge label="NC" tone="warning" /> : null}
      {noDerivatives ? <Badge label="ND" tone="warning" /> : null}
      {shareAlike ? <Badge label="SA" tone="neutral" /> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.xs,
  },
}));

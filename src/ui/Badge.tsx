import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

type Props = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral' }: Props) {
  styles.useVariants({ tone });
  return (
    <View style={styles.badge}>
      <Text variant="caption" weight="semibold" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    variants: {
      tone: {
        neutral: { backgroundColor: theme.colors.surfaceElevated },
        accent: { backgroundColor: theme.colors.accentMuted },
        success: { backgroundColor: 'rgba(91,174,122,0.18)' },
        warning: { backgroundColor: 'rgba(224,169,59,0.18)' },
        danger: { backgroundColor: 'rgba(229,96,77,0.18)' },
      },
    },
  },
  label: {
    variants: {
      tone: {
        neutral: { color: theme.colors.textSecondary },
        accent: { color: theme.colors.accent },
        success: { color: theme.colors.success },
        warning: { color: theme.colors.warning },
        danger: { color: theme.colors.danger },
      },
    },
  },
}));

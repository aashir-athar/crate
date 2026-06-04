import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { IconName } from '@/ui/RoundIconButton';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';

type Props = {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={52} color={theme.colors.textTertiary} />
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      <Text variant="body" color="secondary" style={styles.center}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.xxl,
    gap: theme.space.md,
  },
  center: { textAlign: 'center' },
  action: { marginTop: theme.space.sm },
}));

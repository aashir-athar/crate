import type { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text, type TextColor } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
};

const TEXT_COLOR: Record<Variant, TextColor> = {
  primary: 'onAccent',
  danger: 'onAccent',
  secondary: 'primary',
  ghost: 'accent',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  fullWidth = false,
  haptic = true,
}: Props) {
  styles.useVariants({ variant, disabled });
  const handlePress = () => {
    if (disabled) return;
    if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, fullWidth && styles.fullWidth, pressed && styles.pressed]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant="callout" weight="semibold" color={TEXT_COLOR[variant]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    variants: {
      variant: {
        primary: { backgroundColor: theme.colors.accent },
        danger: { backgroundColor: theme.colors.danger },
        secondary: { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
        ghost: { backgroundColor: 'transparent' },
      },
      disabled: {
        true: { opacity: 0.45 },
        false: {},
      },
    },
  },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85 },
  icon: { marginRight: 2 },
}));

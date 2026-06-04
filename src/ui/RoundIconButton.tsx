import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export type IconName = keyof typeof Ionicons.glyphMap;

type Variant = 'plain' | 'filled' | 'accent';

type Props = {
  name: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  variant?: Variant;
  disabled?: boolean;
  haptic?: boolean;
};

export function RoundIconButton({
  name,
  accessibilityLabel,
  onPress,
  size = 22,
  variant = 'plain',
  disabled = false,
  haptic = true,
}: Props) {
  const { theme } = useUnistyles();
  styles.useVariants({ variant, disabled });

  const iconColor = disabled
    ? theme.colors.textTertiary
    : variant === 'accent'
      ? theme.colors.onAccent
      : theme.colors.text;

  const handlePress = () => {
    if (disabled) return;
    if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={theme.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name={name} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.round,
    variants: {
      variant: {
        plain: { backgroundColor: 'transparent' },
        filled: { backgroundColor: theme.colors.surfaceElevated },
        accent: { backgroundColor: theme.colors.accent },
      },
      disabled: {
        true: {},
        false: {},
      },
    },
  },
  pressed: { opacity: 0.6 },
}));

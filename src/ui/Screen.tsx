import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

type Props = ViewProps & {
  children: ReactNode;
  /** Apply the top safe-area inset as padding (for non-list screens). */
  topInset?: boolean;
};

/** Full-bleed themed screen background. Lists handle their own bottom inset. */
export function Screen({ children, topInset = false, style, ...rest }: Props) {
  styles.useVariants({ topInset });
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    variants: {
      topInset: {
        true: { paddingTop: rt.insets.top },
        false: {},
      },
    },
  },
}));

import { Text as RNText, type TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type TextVariant =
  | 'display'
  | 'largeTitle'
  | 'title'
  | 'headline'
  | 'body'
  | 'callout'
  | 'footnote'
  | 'caption';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'onAccent'
  | 'danger';

export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

type Props = TextProps & {
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextWeight;
};

export function Text({
  variant = 'body',
  color = 'primary',
  weight,
  style,
  ...rest
}: Props) {
  styles.useVariants({ variant, color, weight: weight ?? 'inherit' });
  return <RNText style={[styles.text, style]} {...rest} />;
}

const styles = StyleSheet.create((theme) => ({
  text: {
    fontFamily: theme.typography.family.body,
    color: theme.colors.text,
    variants: {
      variant: {
        display: {
          fontFamily: theme.typography.family.display,
          fontSize: theme.typography.size.display,
          lineHeight: theme.typography.size.display * theme.typography.lineHeight.tight,
          fontWeight: theme.typography.weight.bold,
          letterSpacing: -0.5,
        },
        largeTitle: {
          fontFamily: theme.typography.family.display,
          fontSize: theme.typography.size.largeTitle,
          lineHeight: theme.typography.size.largeTitle * theme.typography.lineHeight.tight,
          fontWeight: theme.typography.weight.bold,
          letterSpacing: -0.3,
        },
        title: {
          fontFamily: theme.typography.family.display,
          fontSize: theme.typography.size.title,
          lineHeight: theme.typography.size.title * theme.typography.lineHeight.tight,
          fontWeight: theme.typography.weight.semibold,
        },
        headline: {
          fontSize: theme.typography.size.headline,
          lineHeight: theme.typography.size.headline * theme.typography.lineHeight.normal,
          fontWeight: theme.typography.weight.semibold,
        },
        body: {
          fontSize: theme.typography.size.body,
          lineHeight: theme.typography.size.body * theme.typography.lineHeight.normal,
        },
        callout: {
          fontSize: theme.typography.size.callout,
          lineHeight: theme.typography.size.callout * theme.typography.lineHeight.normal,
          fontWeight: theme.typography.weight.medium,
        },
        footnote: {
          fontSize: theme.typography.size.footnote,
          lineHeight: theme.typography.size.footnote * theme.typography.lineHeight.normal,
        },
        caption: {
          fontSize: theme.typography.size.caption,
          lineHeight: theme.typography.size.caption * theme.typography.lineHeight.normal,
        },
      },
      color: {
        primary: { color: theme.colors.text },
        secondary: { color: theme.colors.textSecondary },
        tertiary: { color: theme.colors.textTertiary },
        accent: { color: theme.colors.accent },
        onAccent: { color: theme.colors.onAccent },
        danger: { color: theme.colors.danger },
      },
      weight: {
        regular: { fontWeight: theme.typography.weight.regular },
        medium: { fontWeight: theme.typography.weight.medium },
        semibold: { fontWeight: theme.typography.weight.semibold },
        bold: { fontWeight: theme.typography.weight.bold },
        inherit: {},
      },
    },
  },
}));

import { Appearance } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { hitSlop, motion, palettes, radius, space, typography } from './tokens';

/**
 * Unistyles configuration. Imported once for its side effect at the app entry
 * (top of src/app/_layout.tsx) BEFORE any component creates styles.
 *
 * Three themes share one token contract; only `colors` differs. The settings
 * store drives runtime theme changes via UnistylesRuntime.setTheme().
 */

const shared = { space, radius, typography, motion, hitSlop } as const;

const lightTheme = { colors: palettes.light, ...shared } as const;
const darkTheme = { colors: palettes.dark, ...shared } as const;
const oledTheme = { colors: palettes.oled, ...shared } as const;

export const appThemes = {
  light: lightTheme,
  dark: darkTheme,
  oled: oledTheme,
} as const;

export const breakpoints = {
  xs: 0,
  sm: 360,
  md: 768,
  lg: 1024,
} as const;

export type AppTheme = typeof darkTheme;
export type AppThemeName = keyof typeof appThemes;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends AppThemes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: appThemes,
  breakpoints,
  settings: {
    // Resolve the initial theme from the system; the settings store reconciles
    // this on hydrate (including the OLED option, which has no system equivalent).
    initialTheme: () => (Appearance.getColorScheme() === 'light' ? 'light' : 'dark'),
  },
});

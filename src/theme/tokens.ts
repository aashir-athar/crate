import { Platform } from 'react-native';

/**
 * Design tokens for Crate. A single "record-crate" aesthetic: deep warm-neutral
 * surfaces, cream text, a saturated amber accent (vinyl sleeves) and a cool
 * secondary for the player. Shared scales (space/radius/typography/motion) are
 * theme-independent; only `colors` changes between light / dark / oled.
 */

export const space = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
} as const;

const fontFamily = Platform.select({
  ios: { display: 'system-ui', body: 'system-ui', mono: 'ui-monospace' },
  android: { display: 'sans-serif-medium', body: 'sans-serif', mono: 'monospace' },
  default: { display: 'System', body: 'System', mono: 'monospace' },
}) ?? { display: 'System', body: 'System', mono: 'monospace' };

export const typography = {
  family: fontFamily,
  size: {
    caption: 12,
    footnote: 13,
    body: 15,
    callout: 16,
    headline: 18,
    title: 22,
    largeTitle: 28,
    display: 34,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.35,
    relaxed: 1.5,
  },
} as const;

export const motion = {
  duration: { instant: 80, fast: 150, base: 250, slow: 400 },
  spring: { damping: 18, stiffness: 180, mass: 1 },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export type ColorPalette = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentMuted: string;
  onAccent: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  skeleton: string;
  skeletonHighlight: string;
  overlay: string;
};

export const palettes: Record<'light' | 'dark' | 'oled', ColorPalette> = {
  dark: {
    bg: '#0B0A0A',
    surface: '#151313',
    surfaceElevated: '#1E1B1A',
    surfaceSunken: '#0F0E0D',
    border: '#2A2625',
    text: '#F5EFE7',
    textSecondary: '#B9B1A7',
    textTertiary: '#7E766C',
    accent: '#E8732C',
    accentMuted: '#3A2417',
    onAccent: '#1A0E06',
    secondary: '#5BB0C9',
    success: '#5BAE7A',
    warning: '#E0A93B',
    danger: '#E5604D',
    skeleton: '#1E1B1A',
    skeletonHighlight: '#2C2826',
    overlay: 'rgba(0,0,0,0.6)',
  },
  oled: {
    bg: '#000000',
    surface: '#0C0B0B',
    surfaceElevated: '#141212',
    surfaceSunken: '#000000',
    border: '#211E1D',
    text: '#F5EFE7',
    textSecondary: '#B5ADA3',
    textTertiary: '#79716A',
    accent: '#E8732C',
    accentMuted: '#34200F',
    onAccent: '#1A0E06',
    secondary: '#5BB0C9',
    success: '#5BAE7A',
    warning: '#E0A93B',
    danger: '#E5604D',
    skeleton: '#121010',
    skeletonHighlight: '#1E1B1A',
    overlay: 'rgba(0,0,0,0.72)',
  },
  light: {
    bg: '#FBF7F0',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSunken: '#F1EBE1',
    border: '#E7DCCB',
    text: '#1A1614',
    textSecondary: '#5C544B',
    textTertiary: '#8A8076',
    accent: '#C75A18',
    accentMuted: '#F3E2D3',
    onAccent: '#FFFFFF',
    secondary: '#2F7E96',
    success: '#2E8B57',
    warning: '#B5862B',
    danger: '#C0392B',
    skeleton: '#ECE4D8',
    skeletonHighlight: '#F6F0E7',
    overlay: 'rgba(0,0,0,0.4)',
  },
};

import {Platform, type TextStyle, type ViewStyle} from 'react-native';

export const theme = {
  colors: {
    background: '#05070B',
    surface: '#0F131A',
    surfaceElevated: '#171D27',
    surfaceMuted: '#1D2530',
    border: 'rgba(255,255,255,0.08)',
    text: '#F5F7FA',
    textMuted: '#9EA8B6',
    textSoft: '#697282',
    accent: '#7CFF4F',
    accentStrong: '#55DF7B',
    accentSecondary: '#51C7FF',
    danger: '#FF6F7D',
    warning: '#F3C96A',
    success: '#39D98A',
    cardOverlay: 'rgba(255,255,255,0.04)',
    overlay: 'rgba(5,7,11,0.72)',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    xxl: 36,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    pill: 999,
  },
  typography: {
    display: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700' as TextStyle['fontWeight'],
      letterSpacing: -0.8,
    },
    title: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as TextStyle['fontWeight'],
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    caption: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as TextStyle['fontWeight'],
    },
    monoNumber: {
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    },
  },
};

export const focusAccentMap: Record<string, string> = {
  Push: '#FF6B9B',
  Pull: '#52C6FF',
  Legs: '#FF8F4E',
  Upper: '#7CFF4F',
  Lower: '#B38CFF',
  'Full Body': '#54F0C2',
};

export const getFocusAccent = (focus: string) =>
  focusAccentMap[focus] ?? theme.colors.accent;

export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  android: {
    elevation: 8,
  },
  default: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowOffset: {width: 0, height: 10},
    shadowRadius: 20,
  },
})!;

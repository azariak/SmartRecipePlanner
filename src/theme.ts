import { Platform } from 'react-native';

/**
 * Design tokens lifted from the Forage.dc.html Claude Design.
 * Dark editorial palette: near-black canvas, warm off-white ink, one loud yellow.
 */
export const colors = {
  bg: '#0A0A08',
  surface: '#12120D',
  ink: '#F4F3EE',
  inkDim: '#DDDCD3',
  yellow: '#F2DA0E',
  yellowBright: '#FFEB2E',
  muted: '#8A897E',
  muted2: '#7A796F',
  muted3: '#6E6D66',
  muted4: '#55544B',
  border: '#26251F',
  border2: '#33322A',
  viewfinderA: '#14140F',
  viewfinderB: '#0E0E0A',
} as const;

/**
 * The design uses three families: Helvetica Neue (sans), Times New Roman italic
 * (the yellow accent lines) and SF Mono (labels). We map these to platform system
 * fonts so nothing needs to be bundled.
 */
export const fonts = {
  sans: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' }) as string,
  serif: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

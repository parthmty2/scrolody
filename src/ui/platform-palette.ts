import { useMemo } from 'react';
import { accentColors, type Accent } from '../lib/settings';
import { accentPalette, type Palette } from './palette';

export function usePlatformPalette(isDark: boolean, accent: Accent): Palette {
  return useMemo(() => accentPalette(isDark, accentColors[accent].hue), [isDark, accent]);
}

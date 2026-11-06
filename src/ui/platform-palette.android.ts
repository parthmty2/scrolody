import { useMaterialColors } from '@expo/ui/jetpack-compose';
import { accentColors, type Accent } from '../lib/settings';
import type { Palette } from './palette';

export function usePlatformPalette(isDark: boolean, accent: Accent): Palette {
  return useMaterialColors({ colorScheme: isDark ? 'dark' : 'light', seedColor: accentColors[accent].seed });
}

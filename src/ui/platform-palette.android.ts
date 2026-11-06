import { useMaterialColors } from '@expo/ui/jetpack-compose';
import type { Palette } from './palette';

export function usePlatformPalette(isDark: boolean): Palette {
  return useMaterialColors({ colorScheme: isDark ? 'dark' : 'light' });
}

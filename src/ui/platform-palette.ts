import { dark, light, type Palette } from './palette';

export function usePlatformPalette(isDark: boolean): Palette {
  return isDark ? dark : light;
}

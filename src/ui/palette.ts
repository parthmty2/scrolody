export type Palette = ReturnType<typeof accentPalette>;

export function accentPalette(isDark: boolean, hue: number) {
  const tone = (saturation: number, lightness: number) => `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  return {
    primary: tone(76, isDark ? 81 : 37),
    onPrimary: isDark ? tone(70, 18) : '#FFFFFF',
    primaryContainer: tone(58, isDark ? 31 : 91),
    onPrimaryContainer: tone(72, isDark ? 94 : 16),
    secondaryContainer: tone(35, isDark ? 27 : 89),
    onSecondaryContainer: tone(44, isDark ? 92 : 17),
    surface: tone(14, isDark ? 8 : 98),
    surfaceDim: tone(12, isDark ? 8 : 86),
    surfaceContainerLow: tone(15, isDark ? 12 : 96),
    surfaceContainer: tone(16, isDark ? 15 : 93),
    surfaceContainerHigh: tone(17, isDark ? 19 : 91),
    surfaceContainerHighest: tone(18, isDark ? 23 : 88),
    onSurface: tone(14, isDark ? 92 : 11),
    onSurfaceVariant: tone(16, isDark ? 80 : 28),
    outline: tone(10, isDark ? 60 : 45),
    outlineVariant: tone(13, isDark ? 30 : 78),
    error: isDark ? '#FFB4AB' : '#BA1A1A',
    errorContainer: isDark ? '#93000A' : '#FFDAD6',
    onErrorContainer: isDark ? '#FFDAD6' : '#410002',
    scrim: '#000000',
  };
}

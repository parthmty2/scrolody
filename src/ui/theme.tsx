import { useFonts, type FontFamilyDefinition } from 'expo-font';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, StyleSheet, useColorScheme } from 'react-native';
import { accentColors, getAccent, getThemeMode, saveAccent, saveThemeMode, type Accent, type ThemeMode } from '../lib/settings';
import type { Palette } from './palette';
import { usePlatformPalette } from './platform-palette';

const fontFamilyName = 'Manrope';
const appFonts: FontFamilyDefinition[] = [{
  fontFamily: fontFamilyName,
  fontDefinitions: [
    { path: require('../../assets/fonts/Manrope_400Regular.ttf'), weight: 400 },
    { path: require('../../assets/fonts/Manrope_500Medium.ttf'), weight: 500 },
    { path: require('../../assets/fonts/Manrope_600SemiBold.ttf'), weight: 600 },
  ],
}];

const MaterialContext = createContext<{
  colors: Palette;
  fontFamily: string | undefined;
  isDark: boolean;
  reduceMotion: boolean;
  themeMode: ThemeMode;
  changeThemeMode: (mode: ThemeMode) => void;
  accent: Accent;
  seedColor: string;
  changeAccent: (accent: Accent) => void;
} | null>(null);

export function MaterialProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(getThemeMode);
  const [accent, setAccent] = useState(getAccent);
  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const seedColor = accentColors[accent].seed;
  const colors = usePlatformPalette(isDark, accent);
  const [fontsLoaded] = useFonts(appFonts);
  const fontFamily = fontsLoaded ? fontFamilyName : undefined;
  const [reduceMotion, setReduceMotion] = useState(true);
  const changeThemeMode = useCallback((mode: ThemeMode) => {
    saveThemeMode(mode);
    setThemeMode(mode);
  }, []);
  const changeAccent = useCallback((next: Accent) => {
    saveAccent(next);
    setAccent(next);
  }, []);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const theme = useMemo(
    () => ({ colors, fontFamily, isDark, reduceMotion, themeMode, changeThemeMode, accent, seedColor, changeAccent }),
    [colors, fontFamily, isDark, reduceMotion, themeMode, changeThemeMode, accent, seedColor, changeAccent],
  );
  return <MaterialContext.Provider value={theme}>{children}</MaterialContext.Provider>;
}

export function useMaterial() {
  const theme = useContext(MaterialContext);
  if (!theme) throw new Error('MaterialProvider is missing');
  return theme;
}
export type { Palette };

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const shape = { extraSmall: 4, small: 8, medium: 12, large: 16, largeIncreased: 20, extraLarge: 28, extraLargeIncreased: 32, extraExtraLarge: 48, full: 9999 };
export const windowClass = { medium: 600, expanded: 840 };
const fastSpatialStiffness = 800;
export const fastSpatialSpring = {
  stiffness: fastSpatialStiffness,
  damping: 2 * 0.6 * Math.sqrt(fastSpatialStiffness),
  mass: 1,
};

export const typography = StyleSheet.create({
  display: { fontSize: 45, lineHeight: 52, fontWeight: '600' },
  headline: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '500' },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500', letterSpacing: 0.15 },
  body: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodySmall: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
});

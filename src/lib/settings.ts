import Storage from 'expo-sqlite/kv-store';

export const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export const skipIntervals = [5, 10, 30] as const;
export const themeModes = ['system', 'light', 'dark'] as const;
export type ThemeMode = typeof themeModes[number];

export type Settings = {
  pageMode: 'continuous' | 'single';
  keepAwake: boolean;
  autoplay: boolean;
  speed: typeof speeds[number];
  skipSeconds: typeof skipIntervals[number];
};

export const defaultSettings: Settings = {
  pageMode: 'continuous',
  keepAwake: false,
  autoplay: true,
  speed: 1,
  skipSeconds: 10,
};

const key = 'reader-settings';
const themeKey = 'appearance-theme';

export function getThemeMode(): ThemeMode {
  try {
    const saved = Storage.getItemSync(themeKey);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemeMode(mode: ThemeMode) {
  Storage.setItemSync(themeKey, mode);
}

export function getSettings(): Settings {
  try {
    const saved: Partial<Settings> = JSON.parse(Storage.getItemSync(key) ?? '{}');
    return {
      pageMode: saved.pageMode === 'single' ? 'single' : 'continuous',
      keepAwake: typeof saved.keepAwake === 'boolean' ? saved.keepAwake : defaultSettings.keepAwake,
      autoplay: typeof saved.autoplay === 'boolean' ? saved.autoplay : defaultSettings.autoplay,
      speed: saved.speed && speeds.includes(saved.speed) ? saved.speed : defaultSettings.speed,
      skipSeconds: saved.skipSeconds && skipIntervals.includes(saved.skipSeconds) ? saved.skipSeconds : defaultSettings.skipSeconds,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings) {
  Storage.setItemSync(key, JSON.stringify(settings));
}

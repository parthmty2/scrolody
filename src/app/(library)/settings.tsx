import { useRouter } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { getSettings, saveSettings, skipIntervals, speeds, themeModes, type Settings, type ThemeMode } from '../../lib/settings';
import { Button, Icon, MText, Screen } from '../../ui/material';
import { PreferenceSwitch } from '../../ui/media-controls';
import { shape, space, useMaterial, windowClass } from '../../ui/theme';

const themeLabels = { system: 'System', light: 'Light', dark: 'Dark' } satisfies Record<ThemeMode, string>;

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, themeMode, changeThemeMode } = useMaterial();
  const { width, fontScale } = useWindowDimensions();
  const [settings, setSettings] = useState(getSettings);
  const [error, setError] = useState(false);

  function change(patch: Partial<Settings>) {
    try {
      const next = { ...settings, ...patch };
      saveSettings(next);
      setSettings(next);
      setError(false);
    } catch {
      setError(true);
    }
  }

  function selectTheme(mode: ThemeMode) {
    try {
      changeThemeMode(mode);
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <MText accessibilityRole="header" variant="display">Settings</MText>
        {error && <MText tone="error" accessibilityLiveRegion="polite">Your changes could not be saved.</MText>}
        <Section title="Appearance" icon="palette">
          <Preference title="Theme" description="System follows your device’s appearance.">
            <Choices label="Theme" values={themeModes} selected={themeMode} format={(mode) => themeLabels[mode]} onChange={selectTheme} connected />
          </Preference>
        </Section>
        <View style={[styles.sections, width >= windowClass.expanded && fontScale < 1.5 && styles.columns]}>
          <Section title="Reading" icon="menu-book">
            <Preference title="Page layout" description="Scroll continuously or turn one page at a time.">
              <Choices label="Page layout" values={['continuous', 'single'] as const} selected={settings.pageMode} format={(mode) => mode === 'continuous' ? 'Vertical scroll' : 'Single page'} onChange={(pageMode) => change({ pageMode })} connected />
            </Preference>
            <Preference title="Keep screen awake" description="Keep the display on while the reader is open."
              trailing={<PreferenceSwitch label="Keep screen awake" value={settings.keepAwake} onChange={(keepAwake) => change({ keepAwake })} />} />
          </Section>
          <Section title="Audiobook" icon="headphones">
            <Preference title="Autoplay" description="Play when you open a project."
              trailing={<PreferenceSwitch label="Autoplay" value={settings.autoplay} onChange={(autoplay) => change({ autoplay })} />} />
            <Preference title="Playback speed">
              <Choices label="Playback speed" values={speeds} selected={settings.speed} format={(speed) => `${speed}×`} onChange={(speed) => change({ speed })} />
            </Preference>
            <Preference title="Skip interval">
              <Choices label="Skip interval" values={skipIntervals} selected={settings.skipSeconds} format={(seconds) => `${seconds} sec`} onChange={(skipSeconds) => change({ skipSeconds })} connected />
            </Preference>
          </Section>
        </View>
        <Section title="App updates" icon="system-update">
          <Preference title="Android releases" description="Check for new versions and manage APK downloads.">
            <Button label="Open updates" icon="system-update" variant="tonal" size="medium" onPress={() => router.push('/updates')} />
          </Preference>
        </Section>
        <View style={[styles.note, { backgroundColor: colors.surfaceContainerLow }]}>
          <Icon name="devices" color={colors.onSurfaceVariant} />
          <MText variant="bodySmall" tone="onSurfaceVariant" style={styles.grow}>Projects and preferences are stored on this device.</MText>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, icon, children }: PropsWithChildren<{ title: string; icon: 'menu-book' | 'headphones' | 'palette' | 'system-update' }>) {
  const { colors } = useMaterial();
  return (
    <View style={styles.section}>
      <View style={styles.sectionLabel}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.tertiaryContainer }]}>
          <Icon name={icon} size={20} color={colors.onTertiaryContainer} />
        </View>
        <MText accessibilityRole="header" variant="title">{title}</MText>
      </View>
      <View style={[styles.group, { backgroundColor: colors.surfaceContainerLow }]}>{children}</View>
    </View>
  );
}

function Preference({ title, description, trailing, children }: PropsWithChildren<{ title: string; description?: string; trailing?: React.ReactNode }>) {
  const { colors } = useMaterial();
  return (
    <View style={[styles.preference, { backgroundColor: colors.surfaceContainer }]}>
      <View style={styles.preferenceRow}>
        <View style={styles.grow}>
          <MText variant="titleMedium">{title}</MText>
          {description && <MText variant="bodySmall" tone="onSurfaceVariant">{description}</MText>}
        </View>
        {trailing}
      </View>
      {children}
    </View>
  );
}

function Choices<T extends string | number>({ label, values, selected, format, onChange, connected }: {
  label: string; values: readonly T[]; selected: T; format: (value: T) => string; onChange: (value: T) => void; connected?: boolean;
}) {
  const { colors } = useMaterial();
  const { fontScale } = useWindowDimensions();
  const joined = connected && fontScale < 1.35;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.options, joined && styles.connected]}>
      {values.map((value, index) => {
        const checked = value === selected;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            onPress={() => onChange(value)}
            style={({ pressed }) => [
              styles.choice,
              joined && styles.segment,
              joined && index === 0 && styles.segmentStart,
              joined && index === values.length - 1 && styles.segmentEnd,
              { backgroundColor: checked ? colors.secondaryContainer : colors.surface,
                borderColor: checked ? colors.secondaryContainer : colors.outlineVariant },
              pressed && styles.pressed,
            ]}
          >
            {checked && <Icon name="check" size={16} color={colors.onSecondaryContainer} />}
            <MText variant="label" tone={checked ? 'onSecondaryContainer' : 'onSurfaceVariant'} style={styles.choiceLabel}>{format(value)}</MText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, paddingTop: space.xl, gap: space.lg, maxWidth: 1040, width: '100%', alignSelf: 'center' },
  sections: { gap: space.lg },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  section: { flex: 1, minWidth: 0, gap: space.sm },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: shape.full },
  group: { borderRadius: shape.extraLarge, padding: space.xs, gap: space.xs },
  preference: { padding: space.md, gap: space.sm, borderRadius: shape.largeIncreased },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  connected: { flexWrap: 'nowrap', gap: space.xs },
  choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: 48, paddingHorizontal: space.sm, paddingVertical: space.sm, borderWidth: 1, borderRadius: shape.full },
  segment: { flex: 1, borderRadius: shape.extraSmall },
  segmentStart: { borderTopStartRadius: shape.full, borderBottomStartRadius: shape.full },
  segmentEnd: { borderTopEndRadius: shape.full, borderBottomEndRadius: shape.full },
  choiceLabel: { flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.72 },
  note: { padding: space.md, borderRadius: shape.largeIncreased, flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

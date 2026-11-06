import { Host, LoadingIndicator, Slider, Switch } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { PreferenceSwitchProps, SeekProps } from './media-controls';
import { Icon } from './material';
import { useMaterial } from './theme';

export function SeekSlider({ position, duration, disabled, onScrub, onSeek }: SeekProps) {
  const latest = useRef<number | null>(null);
  const { isDark, seedColor } = useMaterial();
  return (
    <Host colorScheme={isDark ? 'dark' : 'light'} seedColor={seedColor} matchContents={{ vertical: true }} style={styles.slider}>
      <Slider
        max={duration || 1}
        value={Math.min(position, duration || 1)}
        enabled={!disabled}
        onValueChange={(value) => { latest.current = value; onScrub(value); }}
        onValueChangeFinished={() => {
          if (latest.current !== null) onSeek(latest.current);
          latest.current = null;
        }}
        modifiers={[fillMaxWidth(), semantics({ contentDescription: 'Audiobook position' })]}
      />
    </Host>
  );
}

export function PreferenceSwitch({ label, value, onChange }: PreferenceSwitchProps) {
  const { isDark, seedColor } = useMaterial();
  return (
    <Host colorScheme={isDark ? 'dark' : 'light'} seedColor={seedColor} matchContents>
      <Switch value={value} onCheckedChange={onChange} modifiers={[semantics({ contentDescription: label })]} />
    </Host>
  );
}

export function LoadingMark() {
  const { colors, isDark, reduceMotion, seedColor } = useMaterial();
  if (reduceMotion) return <Icon name="hourglass-empty" color={colors.primary} size={28} />;
  return <Host colorScheme={isDark ? 'dark' : 'light'} seedColor={seedColor} matchContents><LoadingIndicator color={colors.primary} /></Host>;
}

const styles = StyleSheet.create({ slider: { flex: 1, minHeight: 48 } });

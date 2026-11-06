import Slider from '@react-native-community/slider';
import { ActivityIndicator, StyleSheet, Switch } from 'react-native';
import { Icon } from './material';
import { useMaterial } from './theme';

export type SeekProps = {
  position: number; duration: number; disabled: boolean;
  onScrub: (position: number) => void; onSeek: (position: number) => void;
};

export type PreferenceSwitchProps = { label: string; value: boolean; onChange: (value: boolean) => void };

export function SeekSlider({ position, duration, disabled, onScrub, onSeek }: SeekProps) {
  const { colors } = useMaterial();
  return (
    <Slider
      accessibilityLabel="Audiobook position"
      maximumValue={duration || 1}
      value={Math.min(position, duration || 1)}
      disabled={disabled}
      minimumTrackTintColor={colors.primary}
      maximumTrackTintColor={colors.outline}
      thumbTintColor={colors.primary}
      onSlidingStart={onScrub}
      onValueChange={onScrub}
      onSlidingComplete={onSeek}
      style={styles.slider}
    />
  );
}

export function PreferenceSwitch({ label, value, onChange }: PreferenceSwitchProps) {
  const { colors } = useMaterial();
  return <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.surfaceContainerHighest }} />;
}

export function LoadingMark() {
  const { colors, reduceMotion } = useMaterial();
  return reduceMotion ? <Icon name="hourglass-empty" color={colors.primary} size={28} />
    : <ActivityIndicator color={colors.primary} size="large" />;
}

const styles = StyleSheet.create({ slider: { flex: 1, height: 48 } });

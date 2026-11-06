import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, type ComponentProps, type PropsWithChildren } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { fastSpatialSpring, shape, space, typography, useMaterial } from './theme';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type Role = keyof ReturnType<typeof useMaterial>['colors'];

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useMaterial();
  return <MaterialIcons accessible={false} name={name} size={size} color={color ?? colors.onSurface} />;
}

export function MText({ variant = 'body', tone = 'onSurface', style, ...props }: TextProps & {
  variant?: keyof typeof typography;
  tone?: Role;
}) {
  const { colors, fontFamily } = useMaterial();
  return <Text {...props} style={[typography[variant], { color: colors[tone], fontFamily }, style]} />;
}

export function Screen({ children, edges }: PropsWithChildren<{ edges?: Edge[] }>) {
  const { colors } = useMaterial();
  return <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: colors.surface }]}>{children}</SafeAreaView>;
}

export function Button({ label, icon, onPress, disabled, variant = 'filled', size = 'large', accessibilityLabel }: {
  label: string; icon?: IconName; onPress: () => void; disabled?: boolean;
  variant?: 'filled' | 'tonal' | 'text' | 'danger';
  size?: 'medium' | 'large';
  accessibilityLabel?: string;
}) {
  const { colors, reduceMotion } = useMaterial();
  const [scale] = useState(() => new Animated.Value(1));
  const foreground = variant === 'filled' ? 'onPrimary'
    : variant === 'tonal' ? 'onSecondaryContainer'
    : variant === 'danger' ? 'onErrorContainer' : 'primary';
  const background = variant === 'filled' ? colors.primary
    : variant === 'tonal' ? colors.secondaryContainer
    : variant === 'danger' ? colors.errorContainer : 'transparent';

  function spring(toValue: number) {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue, ...fastSpatialSpring, useNativeDriver: Platform.OS !== 'web' }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => spring(0.96)}
        onPressOut={() => spring(1)}
        style={({ pressed }) => [
          styles.button, size === 'large' && styles.largeButton, { backgroundColor: background },
          pressed && styles.pressed, disabled && styles.disabled,
        ]}
      >
        {icon && <Icon name={icon} color={colors[foreground]} size={22} />}
        <MText variant="label" tone={foreground} style={styles.buttonText}>{label}</MText>
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({ icon, label, onPress, disabled, tonal, colorPair }: {
  icon: IconName; label: string; onPress: () => void; disabled?: boolean; tonal?: boolean;
  colorPair?: { container: string; content: string };
}) {
  const { colors } = useMaterial();
  const backgroundColor = colorPair?.container ?? (tonal ? colors.secondaryContainer : undefined);
  const iconColor = colorPair?.content ?? (tonal ? colors.onSecondaryContainer : colors.onSurfaceVariant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton, { backgroundColor },
        pressed && styles.pressed, disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} color={iconColor} />
    </Pressable>
  );
}

export function TopBar({ title, onBack, disabled }: { title: string; onBack: () => void; disabled?: boolean }) {
  return (
    <View style={styles.topBar}>
      <IconButton icon="arrow-back" label="Back to library" disabled={disabled} onPress={onBack} />
      <MText accessibilityRole="header" variant="title" numberOfLines={1} style={styles.barTitle}>{title}</MText>
    </View>
  );
}

export function OutlinedField({ label, style, onFocus, onBlur, ...props }: TextInputProps & { label: string }) {
  const { colors, fontFamily, isDark } = useMaterial();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <MText variant="label" tone="onSurfaceVariant">{label}</MText>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[
          typography.body, styles.input, { color: colors.onSurface, borderColor: colors.outline, fontFamily },
          focused && { borderColor: colors.primary, borderWidth: 2, paddingHorizontal: space.md - 1, paddingVertical: space.sm - 1 },
          style,
        ]}
      />
    </View>
  );
}

export function Dialog({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const { colors, reduceMotion } = useMaterial();
  return (
    <Modal transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.dialogFrame}>
        <Pressable accessibilityElementsHidden importantForAccessibility="no" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: 0.32 }]} />
        <View accessibilityViewIsModal style={[styles.dialog, { backgroundColor: colors.surfaceContainerHigh }]}>
          <MText accessibilityRole="header" variant="title">{title}</MText>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  button: {
    minHeight: 48, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: shape.full,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
  },
  largeButton: { minHeight: 56 },
  buttonText: { flexShrink: 1, textAlign: 'center' },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: shape.full },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.38 },
  topBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm },
  barTitle: { flex: 1, paddingRight: space.md },
  field: { gap: space.sm },
  input: { minHeight: 56, borderWidth: 1, borderRadius: shape.extraSmall, paddingHorizontal: space.md, paddingVertical: space.sm },
  dialogFrame: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  dialog: { width: '100%', maxWidth: 480, padding: space.lg, gap: space.md, borderRadius: shape.extraLarge },
});

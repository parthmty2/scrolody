import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet } from 'react-native';
import { useMaterial } from './theme';

const mascot = require('../../assets/scrolody-mascot.png');

if (Platform.OS !== 'web') void SplashScreen.preventAutoHideAsync().catch(() => {});

export function LaunchSplash() {
  const { colors } = useMaterial();
  const [progress] = useState(() => new Animated.Value(0));
  const [laidOut, setLaidOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [finished, setFinished] = useState(Platform.OS === 'web');

  const finish = useCallback(() => {
    SplashScreen.hide();
    setFinished(true);
  }, []);

  useEffect(() => {
    if (finished) return;
    const timeout = setTimeout(finish, 1500);
    return () => clearTimeout(timeout);
  }, [finish, finished]);

  useEffect(() => {
    if (finished || !laidOut || !imageLoaded) return;
    let active = true;
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 720, easing: Easing.linear, useNativeDriver: true,
    });
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then((reduceMotion) => {
      if (!active) return;
      if (reduceMotion) {
        finish();
        return;
      }
      SplashScreen.hide();
      animation.start(({ finished: completed }) => {
        if (completed && active) setFinished(true);
      });
    });
    return () => {
      active = false;
      animation.stop();
    };
  }, [finish, finished, imageLoaded, laidOut, progress]);

  if (finished) return null;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => setLaidOut(true)}
      style={[styles.overlay, {
        backgroundColor: colors.surface,
        opacity: progress.interpolate({ inputRange: [0, 0.74, 1], outputRange: [1, 1, 0] }),
      }]}
    >
      <Animated.View style={{ transform: [
        { translateY: progress.interpolate({ inputRange: [0, 0.29, 0.6, 1], outputRange: [0, -13, 0, 0] }) },
        { rotate: progress.interpolate({ inputRange: [0, 0.29, 0.47, 0.68, 1], outputRange: ['0deg', '-7deg', '4deg', '0deg', '0deg'] }) },
        { scale: progress.interpolate({ inputRange: [0, 0.29, 0.6, 1], outputRange: [1, 1.08, 1, 1] }) },
      ] }}>
        <Image source={mascot} style={styles.mascot} onLoad={() => setImageLoaded(true)} onError={finish} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  mascot: { width: 136, height: 136, borderRadius: 34 },
});

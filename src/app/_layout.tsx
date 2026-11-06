import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ApkUpdatesProvider } from '../lib/apk-updates';
import { MaterialProvider, useMaterial } from '../ui/theme';

export default function RootLayout() {
  return <MaterialProvider><ApkUpdatesProvider><AppNavigator /></ApkUpdatesProvider></MaterialProvider>;
}

function AppNavigator() {
  const { colors, isDark, reduceMotion } = useMaterial();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'default', contentStyle: { backgroundColor: colors.surface } }} />
    </>
  );
}

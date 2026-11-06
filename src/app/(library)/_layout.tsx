import { Tabs } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../ui/material';
import { shape, space, useMaterial, windowClass } from '../../ui/theme';

export default function LibraryTabs() {
  const { colors, fontFamily } = useMaterial();
  const { width, fontScale } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const rail = width >= windowClass.medium;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: colors.surface },
      tabBarPosition: rail ? 'left' : 'bottom',
      tabBarVariant: rail ? 'material' : 'uikit',
      tabBarLabelPosition: 'below-icon',
      tabBarStyle: [rail ? styles.rail : [styles.bar, { height: 64 + bottom + Math.max(0, fontScale - 1) * 16 }], { backgroundColor: colors.surfaceContainer }],
      tabBarActiveTintColor: colors.onSurface,
      tabBarInactiveTintColor: colors.onSurfaceVariant,
      tabBarLabelStyle: [styles.label, { fontFamily }],
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings',
        tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
      }} />
    </Tabs>
  );
}

function TabIcon({ name, focused }: { name: 'home' | 'settings'; focused: boolean }) {
  const { colors } = useMaterial();
  return (
    <View style={[styles.indicator, focused && { backgroundColor: colors.secondaryContainer }]}>
      <Icon name={name} color={focused ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 0, elevation: 0, paddingTop: space.sm },
  rail: { width: 88, borderRightWidth: 0, paddingTop: space.md },
  label: { fontSize: 12, fontWeight: '600' },
  indicator: { width: 64, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: shape.full },
});

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useApkUpdates } from '../lib/apk-updates';
import { Button, MText, Screen, TopBar } from '../ui/material';
import { PreferenceSwitch } from '../ui/media-controls';
import { shape, space, useMaterial } from '../ui/theme';

export default function UpdatesScreen() {
  const router = useRouter();
  const { colors } = useMaterial();
  const { installed, configured, autoDownload, changeAutoDownload, release, ready, status, percent, message, error, check, downloadAndInstall } = useApkUpdates();
  const busy = status !== 'idle';

  return (
    <Screen>
      <TopBar title="App updates" onBack={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
          <MText variant="title">Installed build</MText>
          <MText tone="onSurfaceVariant">{installed ? `${installed.versionName} · Build ${installed.versionCode}` : 'Install a Scrolody APK to test app updates.'}</MText>
          {installed && !configured && <MText tone="onSurfaceVariant">This build has no update repository configured.</MText>}
          {installed && configured && (
            <Button label={status === 'checking' ? 'Checking…' : 'Check now'} icon="refresh" size="medium" variant="tonal" disabled={busy} onPress={() => void check()} />
          )}
        </View>
        {installed && configured && (
          <View style={[styles.card, styles.row, { backgroundColor: colors.surfaceContainer }]}>
            <View style={styles.grow}>
              <MText variant="titleMedium">Auto-download on Wi-Fi</MText>
              <MText variant="bodySmall" tone="onSurfaceVariant">Download updates while connected to Wi-Fi. Install when you’re ready.</MText>
            </View>
            <PreferenceSwitch label="Auto-download on Wi-Fi" value={autoDownload} onChange={changeAutoDownload} />
          </View>
        )}
        {release && (
          <View style={[styles.card, { backgroundColor: colors.primaryContainer }]}>
            <MText variant="label" tone="onPrimaryContainer">{ready ? 'Ready to install' : 'Update available'}</MText>
            <MText variant="title" tone="onPrimaryContainer">Scrolody {release.version}</MText>
            <MText variant="bodySmall" tone="onPrimaryContainer">Build {release.versionCode} · {(release.size / 1_048_576).toFixed(1)} MB</MText>
            {!!release.notes && <MText variant="bodySmall" tone="onPrimaryContainer" selectable>{release.notes}</MText>}
            {status === 'downloading' && (
              <View accessibilityRole="progressbar" accessibilityLabel="APK download" accessibilityValue={{ min: 0, max: 100, now: percent }} style={[styles.track, { backgroundColor: colors.surfaceContainerHigh }]}>
                <View style={[styles.progress, { backgroundColor: colors.primary, width: `${percent}%` }]} />
              </View>
            )}
            <Button
              icon="download"
              label={status === 'downloading' ? `Downloading… ${percent}%` : status === 'installing' ? 'Opening installer…' : ready ? 'Install' : 'Download & install'}
              disabled={busy}
              onPress={() => void downloadAndInstall()}
            />
          </View>
        )}
        {!!message && <MText tone={error ? 'error' : 'onSurfaceVariant'} accessibilityLiveRegion="polite">{message}</MText>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: space.md, gap: space.md },
  card: { padding: space.md, gap: space.sm, borderRadius: shape.largeIncreased },
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  track: { height: 8, borderRadius: shape.full, overflow: 'hidden' },
  progress: { height: '100%' },
});

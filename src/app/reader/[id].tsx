import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AudioControls } from '../../components/audio-controls';
import { PdfReader } from '../../components/pdf-reader';
import { getProject } from '../../lib/projects';
import { getSettings } from '../../lib/settings';
import { MText, Screen, TopBar } from '../../ui/material';
import { space } from '../../ui/theme';

export default function ReaderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Reader key={id} id={id} />;
}

function Reader({ id }: { id: string }) {
  const router = useRouter();
  const [settings] = useState(getSettings);
  const [project] = useState(() => {
    try {
      return getProject(id);
    } catch {
      return null;
    }
  });

  return (
    <Screen edges={project ? ['top', 'left', 'right'] : undefined}>
      {project ? (
        <View style={styles.reader}>
          {settings.keepAwake && <KeepReaderAwake />}
          <PdfReader project={project} pageMode={settings.pageMode} onExit={() => router.dismissTo('/')} />
          <AudioControls project={project} settings={settings} />
        </View>
      ) : (
        <>
          <TopBar title="Project unavailable" onBack={() => router.dismissTo('/')} />
          <MText tone="onSurfaceVariant" style={styles.message}>This project could not be opened.</MText>
        </>
      )}
    </Screen>
  );
}

function KeepReaderAwake() {
  useKeepAwake();
  return null;
}

const styles = StyleSheet.create({
  reader: { flex: 1 },
  message: { padding: space.lg },
});

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProjectForm } from '../../components/project-form';
import { getProject, type Project } from '../../lib/projects';
import { MText, Screen, TopBar } from '../../ui/material';
import { space } from '../../ui/theme';

export default function EditProjectScreen() {
  const { id, reconnect } = useLocalSearchParams<{ id: string; reconnect?: string }>();
  const router = useRouter();
  let project: Project | null = null;
  try {
    project = getProject(id);
  } catch {
    // Storage errors and missing projects share the same unavailable state.
  }

  return project ? <ProjectForm key={id} project={project} reconnect={reconnect === '1'} /> : (
    <Screen>
      <TopBar title="Project unavailable" onBack={() => router.dismissTo('/')} />
      <MText tone="onSurfaceVariant" style={{ padding: space.lg }}>This project could not be opened.</MText>
    </Screen>
  );
}

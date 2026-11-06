import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { createProject, deleteProject, ProjectSaveError, updateProject, type Project } from '../lib/projects';
import { Button, Dialog, Icon, MText, OutlinedField, Screen, TopBar } from '../ui/material';
import { shape, space, useMaterial } from '../ui/theme';

type Asset = DocumentPicker.DocumentPickerAsset;
type FileKind = 'book' | 'audio';

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const { colors } = useMaterial();
  const [title, setTitle] = useState(project?.title ?? '');
  const [book, setBook] = useState<Asset>();
  const [audio, setAudio] = useState<Asset>();
  const [picking, setPicking] = useState<FileKind>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function pick(kind: FileKind) {
    setError('');
    setPicking(kind);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: kind === 'book' ? 'application/pdf' : 'audio/*',
        // Copy directly from Android's picker URI into the project folder.
        copyToCacheDirectory: Platform.OS !== 'android',
      });
      if (!result.canceled) {
        if (kind === 'book') setBook(result.assets[0]);
        else setAudio(result.assets[0]);
      }
    } catch {
      setError('That file could not be opened. Try choosing it again.');
    } finally {
      setPicking(undefined);
    }
  }

  async function save() {
    if (saving || picking) return;
    setError('');
    setSaving(true);
    try {
      const name = title.trim() || project?.title || book?.name.replace(/\.pdf$/i, '').trim() || 'Untitled project';
      if (project) {
        await updateProject(project.id, name, book, audio);
        if (active.current) router.dismissTo('/');
      } else if (book && audio) {
        const created = await createProject(name, book, audio);
        if (active.current) router.replace({ pathname: '/reader/[id]', params: { id: created.id } });
      }
    } catch (error) {
      setError(error instanceof ProjectSaveError ? error.message : 'The project could not be saved.');
      if (__DEV__) console.log('[Scrolody] Project save failed:', error instanceof ProjectSaveError ? error.cause : error);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!project || saving || picking) return;
    setDeleting(false);
    try {
      const cleared = deleteProject(project.id);
      router.dismissTo('/');
      if (!cleared) Alert.alert('Project removed', 'Some local files could not be cleared.');
    } catch {
      setError('The project could not be deleted. Try again.');
    }
  }

  const changed = project ? (title.trim() !== '' && title.trim() !== project.title) || !!book || !!audio : !!book && !!audio;
  const actionLabel = saving ? 'Saving…' : project ? 'Save changes' : 'Start project';

  return (
    <Screen>
      <TopBar title={project ? 'Edit project' : 'New project'} disabled={saving} onBack={() => router.dismissTo('/')} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.intro, { backgroundColor: colors.tertiaryContainer }]}>
          <Icon name={project ? 'edit' : 'library-add'} size={32} color={colors.onTertiaryContainer} />
          <MText accessibilityRole="header" variant="headline" tone="onTertiaryContainer">{project ? 'Project details' : 'Pair your files'}</MText>
          <MText tone="onTertiaryContainer">{project ? 'Rename the project or replace either file.' : 'Choose a book PDF and its matching audiobook.'}</MText>
        </View>
        <OutlinedField
          label={project ? 'Project name' : 'Project name (optional)'}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
          placeholder={project?.title || book?.name.replace(/\.pdf$/i, '') || 'Use the PDF filename'}
          maxLength={100}
        />
        <MText accessibilityRole="header" variant="titleMedium">Project files</MText>
        <FilePicker kind="book" filename={book?.name ?? (project && (project.bookName ?? 'Current PDF'))} pending={picking === 'book'} disabled={saving || !!picking} onPress={() => void pick('book')} />
        <FilePicker kind="audio" filename={audio?.name ?? project?.audioName} pending={picking === 'audio'} disabled={saving || !!picking} onPress={() => void pick('audio')} />
        {project && book && (
          <ReplacementNote
            message="Replacing the PDF resets the saved page."
            label="Keep current PDF"
            disabled={saving || !!picking}
            onPress={() => setBook(undefined)}
          />
        )}
        {project && audio && (
          <ReplacementNote
            message="Replacing the audiobook resets its playback position."
            label="Keep current audiobook"
            disabled={saving || !!picking}
            onPress={() => setAudio(undefined)}
          />
        )}
        {error !== '' && <MText accessibilityLiveRegion="polite" tone="onErrorContainer" style={[styles.error, { backgroundColor: colors.errorContainer }]}>{error}</MText>}
        <View style={styles.action}>
          <Button label={actionLabel} icon={project ? 'check' : 'play-arrow'} disabled={!changed || saving || !!picking} onPress={() => void save()} />
        </View>
        {project ? (
          <View style={styles.delete}><Button label="Delete project" icon="delete-outline" variant="danger" size="medium" disabled={saving || !!picking} onPress={() => setDeleting(true)} /></View>
        ) : <MText variant="bodySmall" tone="onSurfaceVariant" style={styles.note}>Both files are stored on this device.</MText>}
      </ScrollView>
      {deleting && (
        <Dialog title="Delete project?" onClose={() => setDeleting(false)}>
          <MText tone="onSurfaceVariant">This removes saved progress and the copies of both files stored in the app.</MText>
          <View style={styles.dialogActions}>
            <Button label="Cancel" variant="text" size="medium" onPress={() => setDeleting(false)} />
            <Button label="Delete" variant="danger" size="medium" onPress={confirmDelete} />
          </View>
        </Dialog>
      )}
    </Screen>
  );
}

function ReplacementNote({ message, label, disabled, onPress }: {
  message: string; label: string; disabled: boolean; onPress: () => void;
}) {
  return (
    <View style={styles.replacement}>
      <MText variant="bodySmall" tone="onSurfaceVariant">{message}</MText>
      <View style={styles.undo}><Button label={label} variant="text" size="medium" disabled={disabled} onPress={onPress} /></View>
    </View>
  );
}

function FilePicker({ kind, filename, pending, disabled, onPress }: {
  kind: FileKind; filename?: string; pending: boolean; disabled: boolean; onPress: () => void;
}) {
  const label = kind === 'book' ? 'Book PDF' : 'Audiobook';
  const { colors } = useMaterial();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filename ? `Replace ${label}, ${filename}` : `Choose ${label}`}
      accessibilityState={{ disabled, busy: pending }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.picker, { backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainer }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.secondaryContainer }]}><Icon name={kind === 'book' ? 'picture-as-pdf' : 'headphones'} color={colors.onSecondaryContainer} /></View>
      <View style={styles.pickerText}>
        <MText variant="titleMedium">{label}</MText>
        <MText variant="bodySmall" tone="onSurfaceVariant" numberOfLines={2}>{filename ?? 'Choose a file'}</MText>
      </View>
      {pending
        ? <ActivityIndicator color={colors.primary} />
        : <Icon name={filename ? 'swap-horiz' : 'add-circle-outline'} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.md, paddingBottom: space.xl, gap: space.md, alignSelf: 'center', maxWidth: 640, width: '100%' },
  intro: { padding: space.lg, gap: space.sm, borderRadius: shape.extraLargeIncreased, borderBottomStartRadius: shape.large },
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72, padding: space.md,
    borderRadius: shape.largeIncreased,
  },
  icon: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: shape.medium,
  },
  pickerText: { flex: 1 },
  replacement: { paddingHorizontal: space.sm, gap: space.xs },
  undo: { alignSelf: 'flex-start' },
  action: { marginTop: space.sm },
  note: { textAlign: 'center' },
  delete: { alignSelf: 'center' },
  error: { padding: space.md, borderRadius: shape.medium },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: space.sm },
});

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { formatTime } from '../../lib/format';
import { useApkUpdates } from '../../lib/apk-updates';
import { listProjects, type Project } from '../../lib/projects';
import { Button, Icon, IconButton, MText, Screen } from '../../ui/material';
import { shape, space, useMaterial, windowClass } from '../../ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { release, ready } = useApkUpdates();
  const { colors } = useMaterial();
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= windowClass.expanded && fontScale < 1.5 ? 2 : 1;
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    try {
      setProjects(listProjects());
      setError(false);
    } catch {
      setError(true);
    }
  }, []));

  function open(project: Project) {
    router.push({ pathname: '/reader/[id]', params: { id: project.id } });
  }

  function edit(project: Project) {
    router.push({ pathname: '/edit-project/[id]', params: { id: project.id } });
  }

  const featured = projects.find(hasProgress);
  const remaining = projects.filter((project) => project.id !== featured?.id);
  const addProject = () => router.push('/new-project');

  return (
    <Screen edges={['top', 'left', 'right']}>
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.columns : undefined}
        data={remaining}
        keyExtractor={(project) => project.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <MText accessibilityRole="header" variant="display">Library</MText>
              {projects.length > 0 && <Button label="New project" icon="add" size="medium" variant="tonal" onPress={addProject} />}
            </View>
            {release && (
              <Button label={ready ? 'Update ready to install' : `Scrolody ${release.version} available`} icon="system-update" variant="tonal" size="medium" onPress={() => router.push('/updates')} />
            )}
            {error && <MText tone="error" accessibilityLiveRegion="polite">Your library could not be loaded.</MText>}
            {featured ? (
              <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}>
                <View style={styles.featureHeading}>
                  <BookArtwork />
                  <IconButton icon="edit" label={`Edit ${featured.title}`} onPress={() => edit(featured)} colorPair={{ container: colors.primary, content: colors.onPrimary }} />
                </View>
                <MText variant="label" tone="onPrimaryContainer">Continue reading</MText>
                <MText variant="headline" tone="onPrimaryContainer" numberOfLines={3}>{featured.title}</MText>
                <MText variant="bodySmall" tone="onPrimaryContainer">{progressLabel(featured)}</MText>
                <View style={styles.heroAction}>
                  <Button label="Resume" accessibilityLabel={`Resume ${featured.title}`} icon="play-arrow" onPress={() => open(featured)} />
                </View>
              </View>
            ) : projects.length === 0 && !error ? (
              <View style={[styles.hero, { backgroundColor: colors.primaryContainer }]}>
                <BookArtwork />
                <MText variant="headline" tone="onPrimaryContainer">Read and listen</MText>
                <MText tone="onPrimaryContainer">Pair a book PDF with its audiobook to start your library.</MText>
                <View style={styles.heroAction}><Button label="New project" icon="add" onPress={addProject} /></View>
              </View>
            ) : projects.length === 0 ? <Button label="New project" icon="add" onPress={addProject} /> : null}
            {remaining.length > 0 && <MText accessibilityRole="header" variant="title">{featured ? 'Other projects' : 'Projects'}</MText>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, columns > 1 && styles.gridCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              accessibilityHint={progressLabel(item)}
              onPress={() => open(item)}
              style={({ pressed }) => [styles.cardMain, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <View style={[styles.cover, { backgroundColor: colors.secondaryContainer }]}>
                <Icon name="menu-book" color={colors.onSecondaryContainer} />
              </View>
              <View style={styles.cardText}>
                <MText variant="titleMedium" numberOfLines={2}>{item.title}</MText>
                <MText variant="bodySmall" tone="onSurfaceVariant" numberOfLines={2}>{progressLabel(item)}</MText>
              </View>
            </Pressable>
            <IconButton icon="edit" label={`Edit ${item.title}`} onPress={() => edit(item)} />
          </View>
        )}
      />
    </Screen>
  );
}

function BookArtwork() {
  const { colors } = useMaterial();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.artwork, { backgroundColor: colors.secondaryContainer }]}>
      <Icon name="menu-book" size={28} color={colors.onSecondaryContainer} />
      <Icon name="graphic-eq" size={20} color={colors.onSecondaryContainer} />
    </View>
  );
}

function hasProgress(project: Project) {
  return project.page > 1 || project.seconds > 0;
}

function progressLabel(project: Project) {
  return hasProgress(project) ? `Page ${project.page} · ${formatTime(project.seconds)}` : 'Ready to start';
}

const styles = StyleSheet.create({
  content: { padding: space.md, paddingBottom: space.xl, gap: space.sm, alignSelf: 'center', width: '100%', maxWidth: 1040 },
  header: { gap: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  hero: { padding: space.lg, gap: space.sm, borderRadius: shape.extraLargeIncreased },
  featureHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  artwork: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.sm,
    height: 48, paddingHorizontal: space.md, marginBottom: space.sm, borderRadius: shape.full,
  },
  heroAction: { alignSelf: 'flex-start', marginTop: space.sm },
  columns: { gap: space.sm },
  gridCard: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingEnd: space.sm, borderRadius: shape.largeIncreased, overflow: 'hidden' },
  cardMain: { flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingStart: space.md },
  cover: { width: 48, height: 48, borderRadius: shape.medium, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
});

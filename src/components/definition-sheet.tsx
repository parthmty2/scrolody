import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dictionarySource, DictionaryLookupError, lookupWord, type DictionaryEntry } from '../lib/dictionary';
import { Button, Icon, IconButton, MText } from '../ui/material';
import { LoadingMark } from '../ui/media-controls';
import { shape, space, useMaterial } from '../ui/theme';

type LookupState =
  | { status: 'loading' }
  | { status: 'result'; entry: DictionaryEntry }
  | { status: 'missing' }
  | { status: 'error'; message: string };

export function DefinitionSheet({ word, onClose }: { word: string; onClose: () => void }) {
  const { colors, reduceMotion } = useMaterial();
  const [lookup, setLookup] = useState<LookupState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => {
      controller.abort();
      if (active) setLookup({ status: 'error', message: 'The lookup timed out. Try again.' });
    }, 10000);
    void lookupWord(word, controller.signal).then((entry) => {
      if (!active || controller.signal.aborted) return;
      setLookup(entry ? { status: 'result', entry } : { status: 'missing' });
    }).catch((error: unknown) => {
      if (!active || controller.signal.aborted) return;
      const message = error instanceof DictionaryLookupError ? error.message : 'Could not look up this word. Check your connection and try again.';
      setLookup({ status: 'error', message });
    }).finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [word, attempt]);

  function retry() {
    setLookup({ status: 'loading' });
    setAttempt((value) => value + 1);
  }

  return (
    <Modal transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.frame}>
        <Pressable accessible={false} importantForAccessibility="no" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: 0.32 }]} />
        <SafeAreaView edges={['bottom', 'left', 'right']} accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <View style={styles.eyebrow}>
                <Icon name="menu-book" size={18} color={colors.primary} />
                <MText variant="label" tone="primary">English dictionary</MText>
              </View>
              <MText accessibilityRole="header" variant="headline" numberOfLines={2}>{word}</MText>
            </View>
            <IconButton icon="close" label="Close definition" onPress={onClose} />
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {lookup.status === 'loading' && (
              <View style={styles.loading}>
                <LoadingMark />
                <MText variant="bodySmall" tone="onSurfaceVariant" accessibilityLiveRegion="polite">Looking up the word…</MText>
              </View>
            )}
            {lookup.status === 'missing' && (
              <MText tone="onSurfaceVariant" accessibilityLiveRegion="polite">No English entry found for this word.</MText>
            )}
            {lookup.status === 'error' && (
              <View style={styles.state}>
                <MText tone="onSurfaceVariant" accessibilityLiveRegion="polite">{lookup.message}</MText>
                <View style={styles.retry}><Button label="Try again" icon="refresh" variant="tonal" size="medium" onPress={retry} /></View>
              </View>
            )}
            {lookup.status === 'result' && <DefinitionResults entry={lookup.entry} />}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function DefinitionResults({ entry }: { entry: DictionaryEntry }) {
  const { colors } = useMaterial();
  return (
    <>
      {entry.definitions.map(({ partOfSpeech, meanings, synonyms }) => (
        <View key={partOfSpeech} style={[styles.definition, { backgroundColor: colors.surfaceContainer }]}>
          <MText accessibilityRole="header" variant="titleMedium" tone="primary" style={styles.partOfSpeech}>{partOfSpeech || 'Meaning'}</MText>
          {meanings.map((meaning, index) => (
            <View key={meaning} style={styles.meaning}>
              {meanings.length > 1 && <MText variant="label" tone="onSurfaceVariant">{index + 1}.</MText>}
              <MText style={styles.grow}>{meaning}</MText>
            </View>
          ))}
          {synonyms.length > 0 && (
            <View style={styles.state}>
              <MText variant="label" tone="onSurfaceVariant">Synonyms</MText>
              <View style={styles.synonyms}>
                {synonyms.map((synonym) => (
                  <MText key={synonym} variant="bodySmall" tone="onSecondaryContainer" style={[styles.synonym, { backgroundColor: colors.secondaryContainer }]}>{synonym}</MText>
                ))}
              </View>
            </View>
          )}
        </View>
      ))}
      {!entry.definitions.some((definition) => definition.synonyms.length > 0) && (
        <MText variant="bodySmall" tone="onSurfaceVariant">No synonyms listed for this word.</MText>
      )}
      <View style={styles.sources}>
        <SourceLink label="FreeDictionaryAPI.com" url={dictionarySource} />
        <SourceLink label="Wiktionary" url={entry.sourceUrl} />
        <SourceLink label="CC BY-SA 4.0" url="https://creativecommons.org/licenses/by-sa/4.0/" />
      </View>
    </>
  );
}

function SourceLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable accessibilityRole="link" style={styles.sourceLink} onPress={() => { void Linking.openURL(url).catch(() => {}); }}>
      <MText variant="labelSmall" tone="primary" style={styles.sourceText}>{label}</MText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '80%', borderTopLeftRadius: shape.extraLarge, borderTopRightRadius: shape.extraLarge },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: space.lg, paddingBottom: space.md, gap: space.sm },
  heading: { flex: 1, gap: space.xs },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  loading: { alignItems: 'center', paddingVertical: space.lg, gap: space.sm },
  state: { gap: space.sm },
  retry: { alignSelf: 'flex-start' },
  definition: { borderRadius: shape.largeIncreased, padding: space.md, gap: space.sm },
  partOfSpeech: { textTransform: 'capitalize' },
  meaning: { flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
  synonyms: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  synonym: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: shape.full, overflow: 'hidden', maxWidth: '100%' },
  sources: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md },
  sourceLink: { minHeight: 48, justifyContent: 'center' },
  sourceText: { textDecorationLine: 'underline' },
});

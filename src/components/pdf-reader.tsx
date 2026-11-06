import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { DefinitionSheet } from './definition-sheet';
import { dictionaryWord } from '../lib/dictionary';
import { projectDirectory, saveProgress, type Project } from '../lib/projects';
import type { Settings } from '../lib/settings';
import { Button, Dialog, IconButton, MText, OutlinedField } from '../ui/material';
import { LoadingMark } from '../ui/media-controls';
import { shape, space, useMaterial } from '../ui/theme';

export function PdfReader({ project, pageMode, onExit }: { project: Project; pageMode: Settings['pageMode']; onExit: () => void }) {
  const { colors } = useMaterial();
  const webView = useRef<WebView<object>>(null);
  const savedPage = useRef(project.page);
  const [uri, setUri] = useState('');
  const [page, setPage] = useState(project.page);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [jump, setJump] = useState<string | null>(null);
  const [definitionWord, setDefinitionWord] = useState<string | null>(null);
  const directory = projectDirectory(project.id);
  const source = useMemo(() => ({ uri }), [uri]);
  const readerTheme = [
    `document.body.style.backgroundColor = ${JSON.stringify(colors.surfaceDim)};`,
    ...Object.entries({
      '--lookup-background': colors.secondaryContainer,
      '--lookup-foreground': colors.onSecondaryContainer,
      '--lookup-outline': colors.outlineVariant,
    }).map(([name, value]) => `document.body.style.setProperty(${JSON.stringify(name)}, ${JSON.stringify(value)});`),
  ].join(' ');

  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const asset = await Asset.fromModule(require('../generated/reader.html')).downloadAsync();
        if (!asset.localUri) throw new Error('Reader asset unavailable');
        const viewer = new File(projectDirectory(project.id), `reader-${asset.hash}.html`);
        if (!viewer.exists) await new File(asset.localUri).copy(viewer);
        if (active) setUri(viewer.uri);
      } catch {
        if (active) setError('The PDF reader could not be loaded.');
      }
    }
    void prepare();
    return () => { active = false; };
  }, [project.id]);

  function showPage(target: number) {
    webView.current?.injectJavaScript(`window.showPage(${target}); true;`);
  }

  function zoom(steps: -1 | 1) {
    webView.current?.injectJavaScript(`window.zoomPage(${steps}); true;`);
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.ready === true) {
        const options = { file: project.bookFile ?? 'book.pdf', page: savedPage.current, pageMode };
        webView.current?.injectJavaScript(`${readerTheme} window.openBook(${JSON.stringify(options)}); true;`);
      } else if (typeof message.define === 'string' && message.define.length <= 80) {
        const word = dictionaryWord(message.define);
        if (word) setDefinitionWord(word);
      } else if (typeof message.error === 'string') {
        setError(message.error);
      } else if (Number.isInteger(message.page) && Number.isInteger(message.total)) {
        setPage(message.page);
        setTotal(message.total);
        if (message.page !== savedPage.current) {
          try {
            saveProgress(project.id, { page: message.page });
            savedPage.current = message.page;
          } catch {
            // Reading can continue if local storage is temporarily unavailable.
          }
        }
      }
    } catch {
      setError('The PDF reader stopped responding.');
    }
  }

  const canNavigate = total > 0 && error === '';
  useEffect(() => {
    if (canNavigate) webView.current?.injectJavaScript(`${readerTheme} true;`);
  }, [canNavigate, readerTheme]);
  const jumpPage = Number(jump);
  const validJump = Number.isInteger(jumpPage) && jumpPage >= 1 && jumpPage <= total;

  function goToPage() {
    if (!validJump) return;
    showPage(jumpPage);
    setJump(null);
  }

  return (
    <View style={styles.reader}>
      <View style={[styles.document, { backgroundColor: colors.surfaceDim }]}>
        {uri !== '' && error === '' && (
          <WebView<object>
            ref={webView}
            source={source}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={(request) => request.url === uri}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowingReadAccessToURL={directory.uri}
            setBuiltInZoomControls={false}
            onMessage={onMessage}
            onError={() => setError('The PDF reader could not be opened.')}
            onContentProcessDidTerminate={() => setError('The PDF reader closed. Reopen this project to continue.')}
            onRenderProcessGone={() => setError('The PDF reader closed. Reopen this project to continue.')}
            style={{ backgroundColor: colors.surfaceDim }}
          />
        )}
        {error !== '' ? (
          <View style={styles.center}><MText accessibilityLiveRegion="polite" style={styles.message}>{error}</MText></View>
        ) : total === 0 && (
          <View style={[styles.loading, { backgroundColor: colors.surfaceContainer }]} pointerEvents="none">
            <LoadingMark />
            <MText variant="label">Opening PDF…</MText>
          </View>
        )}
      </View>
      <View style={[styles.toolbar, { backgroundColor: colors.surfaceContainer }]}>
        <IconButton icon="home" label="Back to library" onPress={onExit} />
        <View style={styles.pageControls}>
          <IconButton icon="chevron-left" label="Previous page" disabled={!canNavigate || page <= 1} onPress={() => showPage(page - 1)} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Go to page, currently ${page} of ${total}`} accessibilityState={{ disabled: !canNavigate }} disabled={!canNavigate} onPress={() => setJump(String(page))} style={styles.pageNumber}>
            <MText variant="label" tone="onSecondaryContainer" numberOfLines={1} style={[styles.pagePill, { backgroundColor: colors.secondaryContainer }]}>{total ? `${page} / ${total}` : 'PDF'}</MText>
          </Pressable>
          <IconButton icon="chevron-right" label="Next page" disabled={!canNavigate || page >= total} onPress={() => showPage(page + 1)} />
        </View>
        <View style={styles.pageControls}>
          <IconButton icon="zoom-out" label="Zoom out" disabled={!canNavigate} onPress={() => zoom(-1)} />
          <IconButton icon="zoom-in" label="Zoom in" disabled={!canNavigate} onPress={() => zoom(1)} />
        </View>
      </View>
      {jump !== null && (
        <Dialog title="Go to page" onClose={() => setJump(null)}>
              <MText tone="onSurfaceVariant">Enter a page from 1 to {total}.</MText>
              <OutlinedField
                label="Page number"
                keyboardType="number-pad"
                selectTextOnFocus
                value={jump}
                onChangeText={(value) => setJump(value.replace(/\D/g, ''))}
                onSubmitEditing={goToPage}
              />
              <View style={styles.dialogActions}>
                <Button label="Cancel" variant="text" size="medium" onPress={() => setJump(null)} />
                <Button label="Go" accessibilityLabel="Go to page" size="medium" disabled={!validJump} onPress={goToPage} />
              </View>
        </Dialog>
      )}
      {definitionWord !== null && (
        <DefinitionSheet key={definitionWord} word={definitionWord} onClose={() => setDefinitionWord(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reader: { flex: 1 },
  document: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg },
  loading: {
    ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.md,
  },
  message: { textAlign: 'center' },
  toolbar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageControls: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  pageNumber: { minHeight: 48, minWidth: 48, flexShrink: 1, alignItems: 'center', justifyContent: 'center' },
  pagePill: { borderRadius: shape.full, paddingHorizontal: space.sm, paddingVertical: space.xs, overflow: 'hidden' },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: space.sm },
});

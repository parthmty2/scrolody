import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTime } from '../lib/format';
import { projectTracks, saveProgress, type Project } from '../lib/projects';
import type { Settings } from '../lib/settings';
import { Button, Dialog, IconButton, MText } from '../ui/material';
import { SeekSlider } from '../ui/media-controls';
import { shape, space, useMaterial } from '../ui/theme';

const skipIcons = {
  5: ['replay-5', 'forward-5'],
  10: ['replay-10', 'forward-10'],
  30: ['replay-30', 'forward-30'],
} as const;

export function AudioControls({ project, settings }: { project: Project; settings: Settings }) {
  const tracks = projectTracks(project);
  const [selection, setSelection] = useState(() => ({
    index: Math.max(0, Math.min(tracks.length - 1, project.audioTrack ?? 0)),
    seconds: project.seconds,
    autoplay: settings.autoplay,
  }));
  const [changeError, setChangeError] = useState('');
  const track = tracks[selection.index];
  if (!track) return <MText tone="error">No audiobook is linked to this project.</MText>;

  function select(index: number, autoplay: boolean) {
    if (index === selection.index || !tracks[index]) return;
    try {
      saveProgress(project.id, { audioTrack: index, seconds: 0 });
      setChangeError('');
      setSelection({ index, seconds: 0, autoplay });
    } catch {
      setChangeError('The chapter change could not be saved. Try again.');
    }
  }

  return <TrackControls key={track.uri} id={project.id} tracks={tracks} selection={selection} settings={settings} changeError={changeError} onSelect={select} />;
}

function TrackControls({ id, tracks, selection, settings, changeError, onSelect }: {
  id: string;
  tracks: ReturnType<typeof projectTracks>;
  selection: { index: number; seconds: number; autoplay: boolean };
  settings: Settings;
  changeError: string;
  onSelect: (index: number, autoplay: boolean) => void;
}) {
  const router = useRouter();
  const { colors } = useMaterial();
  const { index, seconds, autoplay } = selection;
  const player = useAudioPlayer(tracks[index].uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [ready, setReady] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [seekPending, setSeekPending] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const latest = useRef(seconds);
  const saved = useRef(seconds);
  const advanced = useRef(false);

  useEffect(() => {
    if (!status.isLoaded || ready || error) return;
    let active = true;
    async function start() {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (!active) return;
        const duration = player.duration;
        if (seconds > 0) {
          await player.seekTo(duration > 0 ? Math.min(seconds, duration) : seconds);
        }
        if (active) {
          player.setPlaybackRate(settings.speed);
          if (autoplay && (!duration || seconds < duration)) player.play();
          setReady(true);
        }
      } catch {
        if (active) setError('The audiobook could not start.');
      }
    }
    void start();
    return () => { active = false; };
  }, [error, player, seconds, ready, autoplay, settings.speed, status.isLoaded]);

  useEffect(() => {
    if (!ready || !status.isLoaded || seekPending) return;
    const position = status.didJustFinish ? status.duration : status.currentTime;
    if (!Number.isFinite(position)) return;
    latest.current = position;
    if (Math.abs(position - saved.current) >= 5 || (!status.playing && position !== saved.current)) {
      try {
        saveProgress(id, { seconds: position }, index);
        saved.current = position;
      } catch {
        // The next checkpoint can retry.
      }
    }
  }, [id, index, ready, seekPending, status.currentTime, status.didJustFinish, status.duration, status.isLoaded, status.playing]);

  useEffect(() => {
    if (!ready || !status.didJustFinish || advanced.current || index + 1 >= tracks.length) return;
    advanced.current = true;
    onSelect(index + 1, true);
  }, [index, onSelect, ready, status.didJustFinish, tracks.length]);

  useEffect(() => {
    function checkpoint() {
      if (latest.current === saved.current) return;
      try {
        saveProgress(id, { seconds: latest.current }, index);
        saved.current = latest.current;
      } catch {
        // Keep the last saved checkpoint if storage is unavailable.
      }
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') checkpoint();
    });
    return () => {
      subscription.remove();
      checkpoint();
    };
  }, [id, index]);

  const duration = status.duration || 0;
  const position = scrub ?? (ready ? status.currentTime : seconds);
  const unavailable = !ready || seekPending || !!status.error || !!error;
  const skip = settings.skipSeconds;
  const [backIcon, forwardIcon] = skipIcons[skip];

  async function seek(seconds: number, play = false) {
    const target = Math.max(0, Math.min(duration, seconds));
    setSeekPending(true);
    setScrub(target);
    try {
      await player.seekTo(target);
      latest.current = target;
      if (play) player.play();
    } catch {
      setError('The audiobook could not move to that position.');
    } finally {
      setSeekPending(false);
      setScrub(null);
    }
  }

  function togglePlayback() {
    if (status.playing) player.pause();
    else if (status.didJustFinish || (duration > 0 && status.currentTime >= duration)) void seek(0, true);
    else player.play();
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.player, { backgroundColor: colors.surfaceContainerHigh }]}>
      {tracks.length > 1 && (
        <View style={styles.chapters}>
          <Button label={`Chapter ${index + 1} of ${tracks.length}`} icon="list" size="medium" variant="text" onPress={() => setShowChapters(true)} />
        </View>
      )}
      {!!changeError && <MText tone="error" variant="bodySmall">{changeError}</MText>}
      {status.error || error ? (
        <View style={styles.chapters}>
          <MText accessibilityLiveRegion="polite" variant="bodySmall" tone="error" style={styles.error}>{error || 'This audiobook could not be played.'}</MText>
          {Platform.OS === 'android' && <Button label="Reconnect audio" variant="tonal" size="medium" onPress={() => router.replace({ pathname: '/edit-project/[id]', params: { id, reconnect: '1' } })} />}
        </View>
      ) : (
        <View style={styles.timeline}>
          <MText variant="labelSmall" tone="onSurfaceVariant" style={styles.time}>{formatTime(position)}</MText>
          <SeekSlider
            duration={duration}
            position={position}
            disabled={unavailable || duration === 0}
            onScrub={setScrub}
            onSeek={(value) => void seek(value)}
          />
          <MText variant="labelSmall" tone="onSurfaceVariant" style={styles.time}>{formatTime(duration)}</MText>
        </View>
      )}
      <View style={[styles.controls, { backgroundColor: colors.surfaceContainer }]}>
        <IconButton tonal icon={backIcon} label={`Back ${skip} seconds`} disabled={unavailable} onPress={() => void seek(status.currentTime - skip)} />
        <View style={styles.playButton}>
          <Button icon={status.playing ? 'pause' : 'play-arrow'} label={status.playing ? 'Pause' : 'Play'} disabled={unavailable} onPress={togglePlayback} />
        </View>
        <IconButton tonal icon={forwardIcon} label={`Forward ${skip} seconds`} disabled={unavailable} onPress={() => void seek(status.currentTime + skip)} />
      </View>
      {showChapters && (
        <Dialog title="Chapters" onClose={() => setShowChapters(false)}>
          <ScrollView style={styles.chapterList}>
            {tracks.map((track, chapter) => (
              <Button key={track.uri} label={`${chapter + 1}. ${track.name.replace(/\.[^.]+$/, '')}`} icon={chapter === index ? 'check' : undefined} variant={chapter === index ? 'tonal' : 'text'} size="medium" onPress={() => {
                setShowChapters(false);
                onSelect(chapter, status.playing);
              }} />
            ))}
          </ScrollView>
        </Dialog>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  player: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xs },
  controls: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', justifyContent: 'center', borderRadius: shape.full, padding: space.xs, gap: space.xs },
  playButton: { minWidth: 128, flexShrink: 1 },
  timeline: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 600, alignSelf: 'center', gap: space.sm },
  time: { fontVariant: ['tabular-nums'] },
  error: { paddingVertical: space.sm, textAlign: 'center' },
  chapters: { alignItems: 'center' },
  chapterList: { maxHeight: 320 },
});

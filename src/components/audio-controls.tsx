import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTime } from '../lib/format';
import { projectDirectory, saveProgress, type Project } from '../lib/projects';
import type { Settings } from '../lib/settings';
import { Button, IconButton, MText } from '../ui/material';
import { SeekSlider } from '../ui/media-controls';
import { shape, space, useMaterial } from '../ui/theme';

const skipIcons = {
  5: ['replay-5', 'forward-5'],
  10: ['replay-10', 'forward-10'],
  30: ['replay-30', 'forward-30'],
} as const;

export function AudioControls({ project, settings }: { project: Project; settings: Settings }) {
  const { colors } = useMaterial();
  const uri = new File(projectDirectory(project.id), project.audioFile).uri;
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [ready, setReady] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [seekPending, setSeekPending] = useState(false);
  const latest = useRef(project.seconds);
  const saved = useRef(project.seconds);

  useEffect(() => {
    if (!status.isLoaded || ready || error) return;
    let active = true;
    async function start() {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        if (!active) return;
        const duration = player.duration;
        if (project.seconds > 0) {
          await player.seekTo(duration > 0 ? Math.min(project.seconds, duration) : project.seconds);
        }
        if (active) {
          player.setPlaybackRate(settings.speed);
          if (settings.autoplay && (!duration || project.seconds < duration)) player.play();
          setReady(true);
        }
      } catch {
        if (active) setError('The audiobook could not start.');
      }
    }
    void start();
    return () => { active = false; };
  }, [error, player, project.seconds, ready, settings.autoplay, settings.speed, status.isLoaded]);

  useEffect(() => {
    if (!ready || !status.isLoaded || seekPending) return;
    const position = status.didJustFinish ? status.duration : status.currentTime;
    if (!Number.isFinite(position)) return;
    latest.current = position;
    if (Math.abs(position - saved.current) >= 5 || (!status.playing && position !== saved.current)) {
      try {
        saveProgress(project.id, { seconds: position });
        saved.current = position;
      } catch {
        // The next checkpoint can retry.
      }
    }
  }, [project.id, ready, seekPending, status.currentTime, status.didJustFinish, status.duration, status.isLoaded, status.playing]);

  useEffect(() => {
    function checkpoint() {
      if (latest.current === saved.current) return;
      try {
        saveProgress(project.id, { seconds: latest.current });
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
  }, [project.id]);

  const duration = status.duration || 0;
  const position = scrub ?? (ready ? status.currentTime : project.seconds);
  const unavailable = !ready || seekPending || !!status.error;
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
      {status.error || error ? (
        <MText accessibilityLiveRegion="polite" variant="bodySmall" tone="error" style={styles.error}>{error || 'This audiobook could not be played.'}</MText>
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
});

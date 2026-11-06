import { requireOptionalNativeModule } from 'expo';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';

export type AudioTrack = { uri: string; name: string };
export type AudioImport = { name: string; tracks: AudioTrack[]; copy?: boolean; checkOrder?: boolean };
type TrackNumber = { disc: number; track: number };

const metadata = Platform.OS === 'android'
  ? requireOptionalNativeModule<{ trackNumber(uri: string): Promise<TrackNumber | null> }>('ScrolodyAudioMetadata')
  : null;
const audioName = /\.(mp3|m4[ab]|aac|wav|flac|ogg|opus|mp4|amr|3gp|aiff|aif|wma|webm|mka)$/i;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const title = (name: string) => name.replace(/\.[^.]+$/, '');

function filenameNumber(name: string): TrackNumber | null {
  const value = title(name);
  const explicit = value.match(/\b(?:chapter|chap|ch|track)[\s._-]*(\d+)\b/i);
  const disc = value.match(/\b(?:disc|disk|cd)[\s._-]*(\d+)/i);
  const afterDisc = disc && value.slice(disc.index! + disc[0].length).match(/^[\s._-]+(\d+)\b/);
  const leading = value.match(/^\s*(\d{1,3})(?=$|[\s._-])/);
  const number = explicit ?? afterDisc ?? leading;
  return number ? { disc: Number(disc?.[1] ?? 1), track: Number(number[1]) } : null;
}

function section(name: string) {
  const value = title(name).replace(/^\d+[\s._-]+/, '');
  if (/^(?:prologue|preface|introduction|intro)\b/i.test(value)) return 0;
  if (/^(?:epilogue|afterword|outro)\b/i.test(value)) return 2;
  if (/^(?:bonus|extras?)\b/i.test(value)) return 3;
  return 1;
}

async function orderedTracks(tracks: AudioTrack[]) {
  const entries = tracks.map((track) => ({ track, section: section(track.name), number: filenameNumber(track.name) }));
  const main = entries.filter((entry) => entry.section === 1);
  const numbered = () => main.every((entry) => entry.number) &&
    new Set(main.map(({ number }) => `${number?.disc}:${number?.track}`)).size === main.length;
  if (metadata && !numbered()) {
    for (const entry of main) entry.number = await metadata.trackNumber(entry.track.uri).catch(() => null);
  }
  const useNumbers = numbered();
  const sorted = entries.sort((a, b) => a.section - b.section ||
    (useNumbers && a.number && b.number ? a.number.disc - b.number.disc || a.number.track - b.number.track : 0) ||
    collator.compare(a.track.name, b.track.name) || a.track.uri.localeCompare(b.track.uri)).map(({ track }) => track);
  return { tracks: sorted, checkOrder: !useNumbers || entries.some((entry) => entry.section === 3) };
}

export async function pickAudio(folder: boolean): Promise<AudioImport | undefined> {
  if (Platform.OS !== 'android') {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (result.canceled) return;
    const { name, uri } = result.assets[0];
    return { name, tracks: [{ name, uri }], copy: true };
  }

  let name: string | undefined;
  let files: File[];
  if (folder) {
    let directory: Directory;
    try {
      directory = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (String(error).toLowerCase().includes('cancel')) return;
      throw error;
    }
    name = directory.name;
    files = directory.list().filter((item): item is File => item instanceof File)
      .filter((file) => audioName.test(file.name) || file.type.startsWith('audio/'));
  } else {
    const result = await File.pickFileAsync({ multipleFiles: true, mimeTypes: ['audio/*'] });
    if (result.canceled) return;
    files = result.result;
  }
  const tracks = [...new Map(files.map(({ uri, name }) => [uri, { uri, name }])).values()];
  if (!tracks.length) throw new Error('No audio files were found. Choose the folder that contains the chapters.');
  const label = name || (tracks.length === 1 ? tracks[0].name : `${tracks.length} chapters`);
  return { name: label, ...(tracks.length === 1 ? { tracks } : await orderedTracks(tracks)) };
}

export function reconnectTracks(previous: AudioTrack[], selected: AudioTrack[]) {
  const names = new Set(previous.map(({ name }) => name));
  const matching = selected.filter(({ name }) => names.has(name));
  const files = new Map(matching.map((track) => [track.name, track]));
  if (names.size !== previous.length || matching.length !== previous.length || files.size !== previous.length) return null;
  const ordered = previous.map(({ name }) => files.get(name));
  return ordered.every((track) => track !== undefined) ? ordered : null;
}

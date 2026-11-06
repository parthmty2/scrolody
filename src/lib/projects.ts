import { randomUUID } from 'expo-crypto';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { reconnectTracks, type AudioImport, type AudioTrack } from './audio-import';

export type Project = {
  id: string;
  title: string;
  bookName?: string;
  bookFile?: string;
  audioName: string;
  audioFile?: string;
  audioTracks?: AudioTrack[];
  audioTrack?: number;
  page: number;
  seconds: number;
  updatedAt: number;
};

const prefix = 'project:';

export class ProjectSaveError extends Error {}

export function projectDirectory(id: string) {
  return new Directory(Paths.document, 'projects', id);
}

export function getProject(id: string): Project | null {
  const value = Storage.getItemSync(prefix + id);
  return value ? JSON.parse(value) : null;
}

export function listProjects() {
  return Storage.getAllKeysSync()
    .filter((key) => key.startsWith(prefix))
    .map((key) => getProject(key.slice(prefix.length)))
    .filter((project) => project !== null)
    .sort((first, second) => second.updatedAt - first.updatedAt);
}

export function saveProgress(id: string, progress: Partial<Pick<Project, 'page' | 'seconds' | 'audioTrack'>>, expectedTrack?: number) {
  const project = getProject(id);
  if (project && (expectedTrack === undefined || (project.audioTrack ?? 0) === expectedTrack)) {
    Storage.setItemSync(prefix + id, JSON.stringify({ ...project, ...progress, updatedAt: Date.now() }));
  }
}

export function projectTracks(project: Project): AudioTrack[] {
  if (project.audioTracks?.length) return project.audioTracks;
  return project.audioFile ? [{ name: project.audioName, uri: new File(projectDirectory(project.id), project.audioFile).uri }] : [];
}

function audioExtension(name: string) {
  return name.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? '';
}

export async function createProject(title: string, book: DocumentPickerAsset, audio: AudioImport) {
  let directory: Directory | undefined;
  let failure = 'The project folder could not be created.';
  try {
    const id = randomUUID();
    directory = projectDirectory(id);
    directory.create({ intermediates: true });

    const project: Project = {
      id,
      title,
      bookName: book.name,
      audioName: audio.name,
      ...(audio.copy ? { audioFile: 'audiobook' + audioExtension(audio.name) } : { audioTracks: audio.tracks }),
      page: 1,
      seconds: 0,
      updatedAt: Date.now(),
    };

    failure = 'The PDF could not be imported. Choose the file again and retry.';
    await new File(book.uri).copy(new File(directory, 'book.pdf'));
    failure = 'The audiobook could not be imported. Choose the file again and retry.';
    if (project.audioFile) await new File(audio.tracks[0].uri).copy(new File(directory, project.audioFile));
    failure = 'The project could not be added to your library.';
    Storage.setItemSync(prefix + id, JSON.stringify(project));
    return project;
  } catch (error) {
    try {
      if (directory?.exists) directory.delete();
    } catch {
      // Keep the import error if cleanup also fails.
    }
    throw new ProjectSaveError(failure, { cause: error });
  }
}

function removeLocalFile(directory: Directory, name?: string) {
  if (!name) return;
  try {
    const file = new File(directory, name);
    if (file.exists) file.delete();
  } catch {
    // Cleanup does not change which file the project points to.
  }
}

export async function updateProject(id: string, title: string, book?: DocumentPickerAsset, audio?: AudioImport, reconnect = false) {
  const directory = projectDirectory(id);
  const bookFile = book && `book-${randomUUID()}.pdf`;
  const audioFile = audio?.copy ? `audiobook-${randomUUID()}${audioExtension(audio.name)}` : undefined;
  let previous: Project | null;
  let failure = 'The project could not be updated.';

  try {
    if (book && bookFile) {
      failure = 'The replacement PDF could not be imported.';
      await new File(book.uri).copy(new File(directory, bookFile));
    }
    if (audio && audioFile) {
      failure = 'The replacement audiobook could not be imported.';
      await new File(audio.tracks[0].uri).copy(new File(directory, audioFile));
    }
    failure = 'The project changes could not be saved.';
    previous = getProject(id);
    if (!previous) throw new Error('Project unavailable');
    const tracks = audio && reconnect ? reconnectTracks(projectTracks(previous), audio.tracks) : audio?.tracks;
    if (reconnect && (!tracks || audio?.copy)) {
      failure = 'Choose the same audio files by filename to keep your playback position.';
      throw new Error('Replacement files do not match');
    }

    const updated: Project = {
      ...previous,
      title,
      ...(book && bookFile && { bookName: book.name, bookFile, page: 1 }),
      ...(audio && { audioName: reconnect ? previous.audioName : audio.name, audioFile, audioTracks: audioFile ? undefined : tracks ?? undefined }),
      ...(audio && !reconnect && { audioTrack: 0, seconds: 0 }),
      updatedAt: Date.now(),
    };
    Storage.setItemSync(prefix + id, JSON.stringify(updated));
  } catch (cause) {
    removeLocalFile(directory, bookFile);
    removeLocalFile(directory, audioFile);
    throw new ProjectSaveError(failure, { cause });
  }

  if (book) removeLocalFile(directory, previous.bookFile ?? 'book.pdf');
  if (audio) removeLocalFile(directory, previous.audioFile);
}

export function deleteProject(id: string) {
  const directory = projectDirectory(id);
  Storage.removeItemSync(prefix + id);
  try {
    if (directory.exists) directory.delete();
    return true;
  } catch {
    return false;
  }
}

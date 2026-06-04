import { Directory, File, Paths } from 'expo-file-system';

import type { AudioQuality } from '@/types/models';

const TRACKS_DIR = 'tracks';
const AUDIO_EXT_RE = /\.(mp3|flac|ogg|m4a|aac|wav)(?:$|\?)/i;

/** The persistent tracks directory (created on demand). Never use the cache dir. */
export function tracksDir(): Directory {
  const dir = new Directory(Paths.document, TRACKS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function extFromUrl(url: string): string | null {
  const match = url.match(AUDIO_EXT_RE);
  return match ? match[1].toLowerCase() : null;
}

export function extForQuality(quality: AudioQuality): string {
  switch (quality) {
    case 'flac':
      return 'flac';
    case 'ogg':
      return 'ogg';
    default:
      return 'mp3';
  }
}

/** Relative path stored in the index, e.g. 'tracks/<id>.mp3'. Never absolute. */
export function relativePathFor(trackId: string, ext: string): string {
  return `${TRACKS_DIR}/${trackId}.${ext}`;
}

/** Rebuild a File from a stored relative path (handles iOS sandbox UUID changes). */
export function fileFromRelative(relativePath: string): File {
  return new File(Paths.document, ...relativePath.split('/'));
}

/** Absolute file:// URI for playback, rebuilt from the relative path at runtime. */
export function uriFromRelative(relativePath: string): string {
  return fileFromRelative(relativePath).uri;
}

export function fileStat(relativePath: string): { exists: boolean; size: number } {
  const file = fileFromRelative(relativePath);
  if (!file.exists) return { exists: false, size: 0 };
  return { exists: true, size: file.size ?? 0 };
}

export function deleteFileSafe(relativePath: string | null): void {
  if (!relativePath) return;
  try {
    const file = fileFromRelative(relativePath);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup; a missing file is not an error.
  }
}

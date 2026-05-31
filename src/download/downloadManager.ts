import { File } from 'expo-file-system';
import * as Network from 'expo-network';

import { db } from '@/db/client';
import { bumpLibrary } from '@/db/reactivity';
import * as collectionsRepo from '@/db/repositories/collectionsRepo';
import * as tracksRepo from '@/db/repositories/tracksRepo';
import { clamp01 } from '@/lib/format';
import { logger } from '@/lib/logger';
import { downloadQualityToAudio, trackToResolved } from '@/lib/trackMappers';
import { getAdapter } from '@/sources/registry';
import { useSettings } from '@/storage/settingsStore';
import type { DownloadState, Track } from '@/types/models';

import {
  deleteFileSafe,
  extForQuality,
  extFromUrl,
  fileFromRelative,
  relativePathFor,
  tracksDir,
} from './fs';
import { useDownloads } from './downloadStore';

const MAX_CONCURRENT = 3;

const queue: string[] = [];
const tasks = new Map<string, ReturnType<typeof File.createDownloadTask>>();
const cancelled = new Set<string>();
let activeCount = 0;

// Persists the durable state to SQLite. Intentionally does NOT bump the library
// version: live progress/state is surfaced via the granular useDownloads store,
// so intermediate transitions (queued/downloading/paused/error) never trigger a
// full-table re-query. bumpLibrary() is called only when SQLite-derived views
// actually change (a completed download, a deletion, launch reconciliation).
function persistState(
  trackId: string,
  state: DownloadState,
  relativePath: string | null = null,
  fileSizeBytes: number | null = null,
): void {
  tracksRepo.updateDownloadState(trackId, state, relativePath, fileSizeBytes);
}

async function onWifi(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI;
  } catch {
    return true; // fail open; never block downloads on a detection error
  }
}

async function resolveDownloadUrl(track: Track): Promise<string | null> {
  if (track.isDownloadable !== 1 || !track.downloadUrl) return null;
  const audioQuality = downloadQualityToAudio(useSettings.getState().downloadQuality);
  if (audioQuality === 'mp32') return track.downloadUrl;
  try {
    const url = await getAdapter(track.sourceKind).getDownloadUrl(trackToResolved(track), audioQuality);
    return url ?? track.downloadUrl;
  } catch {
    return track.downloadUrl;
  }
}

function recomputeContainingCollections(trackId: string): void {
  const rows = db.getAllSync<{ collectionId: string }>(
    'SELECT collectionId FROM collection_tracks WHERE trackId = ?',
    [trackId],
  );
  for (const row of rows) collectionsRepo.recomputeCounts(row.collectionId);
}

async function runDownload(track: Track): Promise<void> {
  const store = useDownloads.getState();
  cancelled.delete(track.id); // clear any stale cancellation flag from a prior attempt

  if (useSettings.getState().wifiOnlyDownloads && !(await onWifi())) {
    store.patch(track.id, { state: 'paused', error: 'Waiting for Wi-Fi' });
    persistState(track.id, 'paused');
    return;
  }

  const url = await resolveDownloadUrl(track);
  if (!url) {
    store.patch(track.id, { state: 'error', error: 'This track is not available for download.' });
    persistState(track.id, 'error');
    return;
  }

  const audioQuality = downloadQualityToAudio(useSettings.getState().downloadQuality);
  const ext = extFromUrl(url) ?? extForQuality(audioQuality);
  const relativePath = relativePathFor(track.id, ext);
  const file = new File(tracksDir(), `${track.id}.${ext}`);

  store.patch(track.id, { state: 'downloading', error: undefined });
  persistState(track.id, 'downloading');

  try {
    const task = File.createDownloadTask(url, file, {
      onProgress: ({ bytesWritten, totalBytes }) => {
        store.patch(track.id, {
          bytesWritten,
          totalBytes,
          ratio: clamp01(totalBytes > 0 ? bytesWritten / totalBytes : 0),
        });
      },
    });
    tasks.set(track.id, task);
    await task.downloadAsync();
    tasks.delete(track.id);

    const size = file.exists ? file.size ?? 0 : 0;
    if (size <= 0) {
      deleteFileSafe(relativePath);
      store.patch(track.id, { state: 'error', error: 'Downloaded file was empty.' });
      persistState(track.id, 'error');
      return;
    }

    store.patch(track.id, { state: 'downloaded', ratio: 1, bytesWritten: size, totalBytes: size });
    persistState(track.id, 'downloaded', relativePath, size);
    recomputeContainingCollections(track.id);
    bumpLibrary();
  } catch (error) {
    tasks.delete(track.id);
    deleteFileSafe(relativePath);
    if (cancelled.delete(track.id)) {
      store.patch(track.id, { state: 'remote', ratio: 0 });
      persistState(track.id, 'remote');
      return;
    }
    logger.warn('Download failed', { trackId: track.id, error: String(error) });
    store.patch(track.id, { state: 'error', error: String(error) });
    persistState(track.id, 'error');
  }
}

function pump(): void {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const trackId = queue.shift();
    if (!trackId) continue;
    const track = tracksRepo.getTrackById(trackId);
    if (!track) continue;
    activeCount += 1;
    void runDownload(track).finally(() => {
      activeCount -= 1;
      pump();
    });
  }
}

/** Queue a single track for download (no-op if not downloadable or already done/active). */
export function enqueueDownload(track: Track): void {
  if (track.isDownloadable !== 1) return;
  if (track.downloadState === 'downloaded') return;
  if (tasks.has(track.id) || queue.includes(track.id)) return;
  queue.push(track.id);
  useDownloads.getState().setJob({
    trackId: track.id,
    state: 'queued',
    ratio: 0,
    bytesWritten: 0,
    totalBytes: 0,
  });
  persistState(track.id, 'queued');
  pump();
}

export function enqueueMany(tracks: Track[]): void {
  tracks.forEach(enqueueDownload);
}

/** Download every still-pending, legally downloadable track in a collection. */
export function downloadCollection(collectionId: string): number {
  const pending = tracksRepo.getPendingDownloadsForCollection(collectionId);
  enqueueMany(pending);
  return pending.length;
}

export function cancelDownload(trackId: string): void {
  const index = queue.indexOf(trackId);
  if (index >= 0) queue.splice(index, 1);

  const task = tasks.get(trackId);
  if (task) {
    cancelled.add(trackId);
    try {
      task.cancel();
    } catch {
      cancelled.delete(trackId);
    }
  } else {
    useDownloads.getState().patch(trackId, { state: 'remote', ratio: 0 });
    if (tracksRepo.getTrackById(trackId)) persistState(trackId, 'remote');
  }
}

export function retryDownload(trackId: string): void {
  const track = tracksRepo.getTrackById(trackId);
  if (!track) return;
  persistState(trackId, 'remote');
  enqueueDownload({ ...track, downloadState: 'remote' });
}

/** Delete the local file for a downloaded track; keeps the remote library entry. */
export function deleteDownloadedFile(trackId: string): void {
  const track = tracksRepo.getTrackById(trackId);
  if (!track) return;
  deleteFileSafe(track.relativePath);
  persistState(trackId, 'remote');
  useDownloads.getState().remove(trackId);
  recomputeContainingCollections(trackId);
  bumpLibrary();
}

/**
 * On launch: reset interrupted downloads to 'remote' and validate that every
 * 'downloaded' file still exists with bytes (guards the historical 0-byte bug
 * and iOS sandbox path changes).
 */
export function reconcileDownloads(): void {
  db.runSync(
    "UPDATE tracks SET downloadState='remote', relativePath=NULL, fileSizeBytes=NULL WHERE downloadState IN ('downloading','queued')",
  );
  const downloaded = db.getAllSync<Track>("SELECT * FROM tracks WHERE downloadState='downloaded'");
  for (const track of downloaded) {
    if (!track.relativePath) {
      tracksRepo.updateDownloadState(track.id, 'remote');
      continue;
    }
    const file = fileFromRelative(track.relativePath);
    if (!file.exists || (file.size ?? 0) <= 0) {
      deleteFileSafe(track.relativePath);
      tracksRepo.updateDownloadState(track.id, 'remote');
    }
  }
  bumpLibrary();
}

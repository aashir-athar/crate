import { db } from '@/db/client';
import { bumpLibrary } from '@/db/reactivity';
import * as collectionsRepo from '@/db/repositories/collectionsRepo';
import * as tracksRepo from '@/db/repositories/tracksRepo';
import { deleteFileSafe } from '@/download/fs';
import { cancelDownload, enqueueMany } from '@/download/downloadManager';
import { logger } from '@/lib/logger';
import { detectSourceFromUrl, getAdapter } from '@/sources/registry';
import type { ResolvedCollection, SearchResult } from '@/sources/types';
import { useSettings } from '@/storage/settingsStore';
import type { SyncDiff, Track } from '@/types/models';

import { useSync } from './syncStore';

export type ImportResult = {
  collectionId: string;
  trackCount: number;
  downloadableCount: number;
};

const locks = new Set<string>();
let globalLock = false;
let lastForegroundSyncAt = 0;
const FOREGROUND_SYNC_COOLDOWN_MS = 45_000;

function isLocked(collectionId: string): boolean {
  return locks.has(collectionId);
}

function lock(collectionId: string): void {
  locks.add(collectionId);
  useSync.getState().setActive(collectionId, true);
}

function unlock(collectionId: string): void {
  locks.delete(collectionId);
  useSync.getState().setActive(collectionId, false);
}

/** Delete tracks (and their files) no longer referenced by any collection. */
function cleanupOrphans(): void {
  const orphans = db.getAllSync<Track>(
    'SELECT * FROM tracks WHERE id NOT IN (SELECT trackId FROM collection_tracks)',
  );
  if (orphans.length === 0) return;
  orphans.forEach((track) => deleteFileSafe(track.relativePath));
  tracksRepo.deleteOrphanTracks();
}

/** Resolve a pasted URL into a preview without persisting anything. */
export async function previewUrl(url: string): Promise<ResolvedCollection> {
  const normalized = url.trim();
  const adapter = detectSourceFromUrl(normalized);
  if (!adapter) {
    throw new Error(
      'That link is not from a supported source. Use a Jamendo, Internet Archive, or Audius URL.',
    );
  }
  return adapter.resolveUrl(normalized);
}

/** Persist a resolved collection + its tracks, then auto-enqueue downloads. */
export function importResolved(resolved: ResolvedCollection): ImportResult {
  const collectionId = collectionsRepo.upsertCollection({
    sourceKind: resolved.sourceKind,
    sourceCollectionId: resolved.sourceCollectionId,
    sourceUrl: resolved.sourceUrl,
    title: resolved.title,
    artworkUrl: resolved.artworkUrl,
    trackCount: resolved.tracks.length,
  });

  const keepIds: string[] = [];
  resolved.tracks.forEach((track, position) => {
    const trackId = tracksRepo.upsertResolvedTrack(track);
    collectionsRepo.linkTrack(collectionId, trackId, position);
    keepIds.push(trackId);
  });
  collectionsRepo.unlinkTracksNotIn(collectionId, keepIds);
  cleanupOrphans();
  collectionsRepo.recomputeCounts(collectionId);
  collectionsRepo.setLastSynced(collectionId, Date.now());

  const pending = tracksRepo.getPendingDownloadsForCollection(collectionId);
  enqueueMany(pending);
  bumpLibrary();

  return {
    collectionId,
    trackCount: resolved.tracks.length,
    downloadableCount: pending.length,
  };
}

export async function importUrl(url: string): Promise<ImportResult> {
  const resolved = await previewUrl(url);
  return importResolved(resolved);
}

/** Re-resolve a collection, diff against the local index, and apply changes. */
export async function syncCollection(collectionId: string): Promise<SyncDiff> {
  const collection = collectionsRepo.getCollectionById(collectionId);
  if (!collection) throw new Error('Collection not found.');
  if (isLocked(collectionId)) {
    return (
      useSync.getState().lastDiff[collectionId] ?? {
        added: [],
        removed: [],
        unchanged: 0,
        at: Date.now(),
      }
    );
  }

  lock(collectionId);
  try {
    const adapter = getAdapter(collection.sourceKind);
    const resolved = await adapter.resolveUrl(collection.sourceUrl);
    const before = new Set(tracksRepo.getTrackIdsByCollection(collectionId));

    const keepIds: string[] = [];
    const addedIds: string[] = [];
    resolved.tracks.forEach((track, position) => {
      const trackId = tracksRepo.upsertResolvedTrack(track);
      collectionsRepo.linkTrack(collectionId, trackId, position);
      keepIds.push(trackId);
      if (!before.has(trackId)) addedIds.push(trackId);
    });

    const removed = collectionsRepo.unlinkTracksNotIn(collectionId, keepIds);
    cleanupOrphans();
    collectionsRepo.recomputeCounts(collectionId);

    const at = Date.now();
    collectionsRepo.setLastSynced(collectionId, at);

    if (collection.autoSync === 1) {
      enqueueMany(tracksRepo.getPendingDownloadsForCollection(collectionId));
    }

    const diff: SyncDiff = {
      added: addedIds,
      removed,
      unchanged: keepIds.length - addedIds.length,
      at,
    };
    useSync.getState().setDiff(collectionId, diff);
    bumpLibrary();
    return diff;
  } finally {
    unlock(collectionId);
  }
}

/** Sync every auto-sync-enabled collection. Used by background + foreground. */
export async function syncAllAuto(): Promise<void> {
  if (!useSettings.getState().autoSyncEnabled) return;
  if (globalLock) return;
  globalLock = true;
  try {
    const collections = collectionsRepo.getAutoSyncCollections();
    for (const collection of collections) {
      try {
        await syncCollection(collection.id);
      } catch (error) {
        logger.warn('Collection sync failed', { id: collection.id, error: String(error) });
      }
    }
  } finally {
    globalLock = false;
  }
}

/** Foreground trigger (app launch / returns to active), rate-limited. */
export async function foregroundSync(): Promise<void> {
  const now = Date.now();
  if (now - lastForegroundSyncAt < FOREGROUND_SYNC_COOLDOWN_MS) return;
  lastForegroundSyncAt = now;
  await syncAllAuto();
}

function reconstructUrl(result: SearchResult): string {
  switch (result.sourceKind) {
    case 'jamendo':
      return `https://www.jamendo.com/playlist/${result.id}`;
    case 'internet_archive':
      return `https://archive.org/details/${result.id}`;
    case 'audius':
      return `https://audius.co/track/${result.id}`;
  }
}

/** Delete a crate and any tracks/files it leaves orphaned. */
export function removeCollection(collectionId: string): void {
  // Cancel any in-flight downloads for this crate first, so a transfer that
  // finishes after deletion can't leave an orphaned file. Downloaded tracks are
  // left untouched so cleanupOrphans can still delete their files.
  for (const trackId of tracksRepo.getTrackIdsByCollection(collectionId)) {
    const track = tracksRepo.getTrackById(trackId);
    if (
      track &&
      (track.downloadState === 'downloading' ||
        track.downloadState === 'queued' ||
        track.downloadState === 'paused')
    ) {
      cancelDownload(trackId);
    }
  }
  collectionsRepo.deleteCollection(collectionId);
  cleanupOrphans();
  bumpLibrary();
}

/** Import a browse/search result into a crate, then auto-download. */
export async function importSearchResult(result: SearchResult): Promise<ImportResult> {
  const adapter = getAdapter(result.sourceKind);

  if (result.kind === 'track') {
    // Single-track result (Audius): resolve the one track into a one-track crate.
    if (!adapter.getTrack) {
      throw new Error('This result cannot be imported.');
    }
    const track = await adapter.getTrack(result.id);
    if (!track) throw new Error('Could not load that track.');
    return importResolved({
      sourceKind: result.sourceKind,
      sourceCollectionId: result.id,
      sourceUrl: reconstructUrl(result),
      title: result.title,
      artworkUrl: result.artworkUrl,
      tracks: [track],
    });
  }

  const page = await adapter.getCollectionTracks(result.id);
  return importResolved({
    sourceKind: result.sourceKind,
    sourceCollectionId: result.id,
    sourceUrl: reconstructUrl(result),
    title: result.title,
    artworkUrl: result.artworkUrl,
    tracks: page.items,
  });
}

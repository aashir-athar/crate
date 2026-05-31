import { newId } from '@/lib/ids';
import type { DownloadState, ResolvedTrack, Track } from '@/types/models';

import { db } from '../client';

function bit(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

export function getTrackById(id: string): Track | null {
  return db.getFirstSync<Track>('SELECT * FROM tracks WHERE id = ?', [id]) ?? null;
}

export function getTrackBySource(sourceKind: string, sourceTrackId: string): Track | null {
  return (
    db.getFirstSync<Track>(
      'SELECT * FROM tracks WHERE sourceKind = ? AND sourceTrackId = ?',
      [sourceKind, sourceTrackId],
    ) ?? null
  );
}

/**
 * Insert a resolved track, or update its metadata if it already exists (matched
 * by source identity). Local download fields (downloadState / relativePath /
 * fileSizeBytes) are preserved on update. Returns the durable row id.
 */
export function upsertResolvedTrack(resolved: ResolvedTrack): string {
  const existing = getTrackBySource(resolved.sourceKind, resolved.sourceTrackId);
  if (existing) {
    db.runSync(
      `UPDATE tracks SET title=?, artist=?, album=?, durationSec=?, artworkUrl=?,
        downloadUrl=?, streamUrl=?, bestQuality=?, licenseUrl=?, licenseName=?,
        requiresAttribution=?, nonCommercial=?, noDerivatives=?, shareAlike=?, isDownloadable=?
       WHERE id=?`,
      [
        resolved.title,
        resolved.artist,
        resolved.album,
        resolved.durationSec,
        resolved.artworkUrl,
        resolved.downloadUrl,
        resolved.streamUrl,
        resolved.bestQuality,
        resolved.license.url,
        resolved.license.name,
        bit(resolved.license.requiresAttribution),
        bit(resolved.license.nonCommercial),
        bit(resolved.license.noDerivatives),
        bit(resolved.license.shareAlike),
        bit(resolved.isDownloadable),
        existing.id,
      ],
    );
    return existing.id;
  }

  const id = newId();
  db.runSync(
    `INSERT INTO tracks (
      id, sourceKind, sourceTrackId, title, artist, album, durationSec, artworkUrl,
      downloadUrl, streamUrl, bestQuality, licenseUrl, licenseName,
      requiresAttribution, nonCommercial, noDerivatives, shareAlike, isDownloadable,
      downloadState, relativePath, fileSizeBytes, dateAdded
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      resolved.sourceKind,
      resolved.sourceTrackId,
      resolved.title,
      resolved.artist,
      resolved.album,
      resolved.durationSec,
      resolved.artworkUrl,
      resolved.downloadUrl,
      resolved.streamUrl,
      resolved.bestQuality,
      resolved.license.url,
      resolved.license.name,
      bit(resolved.license.requiresAttribution),
      bit(resolved.license.nonCommercial),
      bit(resolved.license.noDerivatives),
      bit(resolved.license.shareAlike),
      bit(resolved.isDownloadable),
      'remote',
      null,
      null,
      Date.now(),
    ],
  );
  return id;
}

export type TrackSort = 'recent' | 'title' | 'artist';

const SORT_SQL: Record<TrackSort, string> = {
  recent: 'dateAdded DESC',
  title: 'title COLLATE NOCASE ASC',
  artist: 'artist COLLATE NOCASE ASC, album COLLATE NOCASE ASC',
};

export function getAllTracks(sort: TrackSort = 'recent'): Track[] {
  return db.getAllSync<Track>(`SELECT * FROM tracks ORDER BY ${SORT_SQL[sort]}`);
}

export function getDownloadedTracks(sort: TrackSort = 'recent'): Track[] {
  return db.getAllSync<Track>(
    `SELECT * FROM tracks WHERE downloadState = 'downloaded' ORDER BY ${SORT_SQL[sort]}`,
  );
}

export function searchTracks(query: string): Track[] {
  const q = `%${query}%`;
  return db.getAllSync<Track>(
    `SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
     ORDER BY title COLLATE NOCASE ASC LIMIT 100`,
    [q, q, q],
  );
}

export function getTracksByCollection(collectionId: string): Track[] {
  return db.getAllSync<Track>(
    `SELECT t.* FROM tracks t
     JOIN collection_tracks ct ON ct.trackId = t.id
     WHERE ct.collectionId = ?
     ORDER BY ct.position ASC`,
    [collectionId],
  );
}

export function getTrackIdsByCollection(collectionId: string): string[] {
  return db
    .getAllSync<{ trackId: string }>(
      'SELECT trackId FROM collection_tracks WHERE collectionId = ? ORDER BY position ASC',
      [collectionId],
    )
    .map((row) => row.trackId);
}

/** Tracks in a collection that are legally downloadable and not yet downloaded. */
export function getPendingDownloadsForCollection(collectionId: string): Track[] {
  return db.getAllSync<Track>(
    `SELECT t.* FROM tracks t
     JOIN collection_tracks ct ON ct.trackId = t.id
     WHERE ct.collectionId = ? AND t.isDownloadable = 1
       AND t.downloadState IN ('remote','error','paused')
     ORDER BY ct.position ASC`,
    [collectionId],
  );
}

export function getAllPendingDownloads(): Track[] {
  return db.getAllSync<Track>(
    "SELECT * FROM tracks WHERE downloadState IN ('queued','downloading','paused','error')",
  );
}

export function updateDownloadState(
  id: string,
  state: DownloadState,
  relativePath: string | null = null,
  fileSizeBytes: number | null = null,
): void {
  if (state === 'downloaded') {
    db.runSync(
      'UPDATE tracks SET downloadState=?, relativePath=?, fileSizeBytes=? WHERE id=?',
      [state, relativePath, fileSizeBytes, id],
    );
  } else if (state === 'remote') {
    db.runSync(
      'UPDATE tracks SET downloadState=?, relativePath=NULL, fileSizeBytes=NULL WHERE id=?',
      [state, id],
    );
  } else {
    db.runSync('UPDATE tracks SET downloadState=? WHERE id=?', [state, id]);
  }
}

export function deleteTrack(id: string): void {
  db.runSync('DELETE FROM tracks WHERE id = ?', [id]);
}

/** Remove tracks no longer referenced by any collection; returns their ids. */
export function deleteOrphanTracks(): string[] {
  const orphans = db.getAllSync<{ id: string }>(
    'SELECT id FROM tracks WHERE id NOT IN (SELECT trackId FROM collection_tracks)',
  );
  if (orphans.length > 0) {
    db.runSync('DELETE FROM tracks WHERE id NOT IN (SELECT trackId FROM collection_tracks)');
  }
  return orphans.map((o) => o.id);
}

export function getStorageStats(): { count: number; bytes: number } {
  const row = db.getFirstSync<{ count: number; bytes: number }>(
    "SELECT COUNT(*) as count, COALESCE(SUM(fileSizeBytes),0) as bytes FROM tracks WHERE downloadState='downloaded'",
  );
  return { count: row?.count ?? 0, bytes: row?.bytes ?? 0 };
}

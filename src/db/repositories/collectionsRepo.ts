import { newId } from '@/lib/ids';
import type { Collection, SourceKind } from '@/types/models';

import { db } from '../client';

export function getCollectionById(id: string): Collection | null {
  return db.getFirstSync<Collection>('SELECT * FROM collections WHERE id = ?', [id]) ?? null;
}

export function getCollectionBySource(
  sourceKind: SourceKind,
  sourceCollectionId: string,
): Collection | null {
  return (
    db.getFirstSync<Collection>(
      'SELECT * FROM collections WHERE sourceKind = ? AND sourceCollectionId = ?',
      [sourceKind, sourceCollectionId],
    ) ?? null
  );
}

export function getAllCollections(): Collection[] {
  return db.getAllSync<Collection>('SELECT * FROM collections ORDER BY dateAdded DESC');
}

export function getAutoSyncCollections(): Collection[] {
  return db.getAllSync<Collection>('SELECT * FROM collections WHERE autoSync = 1');
}

export type UpsertCollectionArgs = {
  sourceKind: SourceKind;
  sourceCollectionId: string;
  sourceUrl: string;
  title: string;
  artworkUrl: string | null;
  trackCount: number;
};

export function upsertCollection(args: UpsertCollectionArgs): string {
  const existing = getCollectionBySource(args.sourceKind, args.sourceCollectionId);
  if (existing) {
    db.runSync(
      'UPDATE collections SET title=?, artworkUrl=?, sourceUrl=?, trackCount=? WHERE id=?',
      [args.title, args.artworkUrl, args.sourceUrl, args.trackCount, existing.id],
    );
    return existing.id;
  }
  const id = newId();
  db.runSync(
    `INSERT INTO collections (
      id, sourceKind, sourceCollectionId, sourceUrl, title, artworkUrl,
      trackCount, downloadedCount, autoSync, lastSyncedAt, dateAdded
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      args.sourceKind,
      args.sourceCollectionId,
      args.sourceUrl,
      args.title,
      args.artworkUrl,
      args.trackCount,
      0,
      1,
      null,
      Date.now(),
    ],
  );
  return id;
}

export function linkTrack(collectionId: string, trackId: string, position: number): void {
  db.runSync(
    'INSERT OR REPLACE INTO collection_tracks (collectionId, trackId, position) VALUES (?,?,?)',
    [collectionId, trackId, position],
  );
}

/** Remove links for tracks no longer present upstream; returns removed track ids. */
export function unlinkTracksNotIn(collectionId: string, keepTrackIds: string[]): string[] {
  const removed = db
    .getAllSync<{ trackId: string }>(
      `SELECT trackId FROM collection_tracks WHERE collectionId = ?${
        keepTrackIds.length > 0
          ? ` AND trackId NOT IN (${keepTrackIds.map(() => '?').join(',')})`
          : ''
      }`,
      [collectionId, ...keepTrackIds],
    )
    .map((r) => r.trackId);

  if (removed.length === 0) return [];

  if (keepTrackIds.length === 0) {
    db.runSync('DELETE FROM collection_tracks WHERE collectionId = ?', [collectionId]);
  } else {
    db.runSync(
      `DELETE FROM collection_tracks WHERE collectionId = ? AND trackId NOT IN (${keepTrackIds
        .map(() => '?')
        .join(',')})`,
      [collectionId, ...keepTrackIds],
    );
  }
  return removed;
}

export function recomputeCounts(collectionId: string): void {
  db.runSync(
    `UPDATE collections SET
      trackCount = (SELECT COUNT(*) FROM collection_tracks WHERE collectionId = ?),
      downloadedCount = (
        SELECT COUNT(*) FROM collection_tracks ct
        JOIN tracks t ON t.id = ct.trackId
        WHERE ct.collectionId = ? AND t.downloadState = 'downloaded'
      )
     WHERE id = ?`,
    [collectionId, collectionId, collectionId],
  );
}

export function setAutoSync(collectionId: string, enabled: boolean): void {
  db.runSync('UPDATE collections SET autoSync = ? WHERE id = ?', [enabled ? 1 : 0, collectionId]);
}

export function setLastSynced(collectionId: string, at: number): void {
  db.runSync('UPDATE collections SET lastSyncedAt = ? WHERE id = ?', [at, collectionId]);
}

export function deleteCollection(collectionId: string): void {
  // collection_tracks rows cascade via the foreign key.
  db.runSync('DELETE FROM collections WHERE id = ?', [collectionId]);
}

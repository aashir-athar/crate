/** SQLite DDL for the Crate library index. Idempotent (IF NOT EXISTS). */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY NOT NULL,
  sourceKind TEXT NOT NULL,
  sourceCollectionId TEXT NOT NULL,
  sourceUrl TEXT NOT NULL,
  title TEXT NOT NULL,
  artworkUrl TEXT,
  trackCount INTEGER NOT NULL DEFAULT 0,
  downloadedCount INTEGER NOT NULL DEFAULT 0,
  autoSync INTEGER NOT NULL DEFAULT 1,
  lastSyncedAt INTEGER,
  dateAdded INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_source
  ON collections(sourceKind, sourceCollectionId);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY NOT NULL,
  sourceKind TEXT NOT NULL,
  sourceTrackId TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  durationSec REAL,
  artworkUrl TEXT,
  downloadUrl TEXT,
  streamUrl TEXT,
  bestQuality TEXT NOT NULL,
  licenseUrl TEXT,
  licenseName TEXT,
  requiresAttribution INTEGER NOT NULL DEFAULT 0,
  nonCommercial INTEGER NOT NULL DEFAULT 0,
  noDerivatives INTEGER NOT NULL DEFAULT 0,
  shareAlike INTEGER NOT NULL DEFAULT 0,
  isDownloadable INTEGER NOT NULL DEFAULT 0,
  downloadState TEXT NOT NULL DEFAULT 'remote',
  relativePath TEXT,
  fileSizeBytes INTEGER,
  dateAdded INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_source
  ON tracks(sourceKind, sourceTrackId);
CREATE INDEX IF NOT EXISTS idx_tracks_state ON tracks(downloadState);
CREATE INDEX IF NOT EXISTS idx_tracks_dateAdded ON tracks(dateAdded);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);

CREATE TABLE IF NOT EXISTS collection_tracks (
  collectionId TEXT NOT NULL,
  trackId TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (collectionId, trackId),
  FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (trackId) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ct_collection ON collection_tracks(collectionId, position);
CREATE INDEX IF NOT EXISTS idx_ct_track ON collection_tracks(trackId);
`;

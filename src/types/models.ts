/**
 * Crate data model.
 *
 * Durable, relational data (tracks, collections, joins, download state) lives in
 * expo-sqlite. Key/value + settings live in AsyncStorage (never MMKV). Ephemeral
 * runtime state (live player position, in-flight downloads) lives in Zustand.
 *
 * SQLite has no native boolean, so persisted booleans are stored as `0 | 1`.
 */

export type SourceKind = 'jamendo' | 'internet_archive' | 'audius';

/** Audio format / quality. `mp32` is the best-lossy default; `flac` is lossless. */
export type AudioQuality = 'mp31' | 'mp32' | 'ogg' | 'flac' | 'stream';

/** Lifecycle of a track's local file. */
export type DownloadState =
  | 'remote'
  | 'queued'
  | 'downloading'
  | 'downloaded'
  | 'paused'
  | 'error';

/** Parsed Creative Commons / public-domain license terms. */
export type LicenseInfo = {
  /** license_ccurl (Jamendo) | licenseurl (Internet Archive) | license (Audius). May be null. */
  url: string | null;
  /** Human label, e.g. 'CC BY-SA 4.0', 'Public Domain'. */
  name: string | null;
  /** BY — credit the artist. */
  requiresAttribution: boolean;
  /** NC — non-commercial only. */
  nonCommercial: boolean;
  /** ND — no derivatives. */
  noDerivatives: boolean;
  /** SA — share alike. */
  shareAlike: boolean;
};

/**
 * A track exactly as an adapter resolves it from a source, before persistence.
 * The adapter is responsible for computing `isDownloadable` (the hard legal gate).
 */
export type ResolvedTrack = {
  sourceKind: SourceKind;
  /** Adapter-native id / hashid / filename. */
  sourceTrackId: string;
  title: string;
  artist: string | null;
  album: string | null;
  durationSec: number | null;
  artworkUrl: string | null;
  /** Direct downloadable file URL when legally allowed; null when blocked. */
  downloadUrl: string | null;
  /** Streaming-only URL fallback (e.g. Internet Archive stream_only, Audius /stream). */
  streamUrl: string | null;
  availableQualities: AudioQuality[];
  bestQuality: AudioQuality;
  license: LicenseInfo;
  /**
   * Hard legal gate, computed per adapter:
   * - Jamendo:  audiodownload_allowed === true
   * - Internet Archive: licenseurl present && collection is NOT stream_only
   * - Audius:   is_downloadable === true && permissive/CC license
   */
  isDownloadable: boolean;
};

/** Persisted track row (table: tracks). */
export type Track = {
  id: string; // app uuid (PK)
  sourceKind: SourceKind;
  sourceTrackId: string;
  title: string;
  artist: string | null;
  album: string | null;
  durationSec: number | null;
  artworkUrl: string | null; // remote; cached by expo-image
  downloadUrl: string | null;
  streamUrl: string | null;
  bestQuality: AudioQuality;
  licenseUrl: string | null;
  licenseName: string | null;
  requiresAttribution: 0 | 1;
  nonCommercial: 0 | 1;
  noDerivatives: 0 | 1;
  shareAlike: 0 | 1;
  isDownloadable: 0 | 1;
  downloadState: DownloadState;
  /** e.g. 'tracks/<id>.mp3' — NEVER an absolute file:// URI (iOS sandbox path changes on reinstall). */
  relativePath: string | null;
  /** Validated post-download; a 0-byte file is treated as failed. */
  fileSizeBytes: number | null;
  dateAdded: number; // epoch ms
};

/** A "crate" = one resolved playlist / collection / album from one source (table: collections). */
export type Collection = {
  id: string; // app uuid (PK)
  sourceKind: SourceKind;
  /** jamendo playlist id | IA collection/item id | audius playlist hashid. */
  sourceCollectionId: string;
  /** Original pasted URL. */
  sourceUrl: string;
  title: string;
  artworkUrl: string | null;
  trackCount: number;
  downloadedCount: number;
  autoSync: 0 | 1;
  lastSyncedAt: number | null;
  dateAdded: number;
};

/** Join row (table: collection_tracks); position preserves source ordering. */
export type CollectionTrack = {
  collectionId: string;
  trackId: string;
  position: number;
};

/** Result of one sync run; surfaced in Collection Detail. */
export type SyncDiff = {
  added: string[]; // track ids
  removed: string[]; // track ids
  unchanged: number;
  at: number; // epoch ms
};

export type RepeatMode = 'off' | 'track' | 'queue';

/** Player runtime state (Zustand; mirrors expo-audio). Only lastTrackId/position persist. */
export type PlayerState = {
  currentTrackId: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionSec: number;
  durationSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Ordered track ids that form the active queue. */
  queueTrackIds: string[];
};

/** Live download-manager entry (Zustand; mirrors the expo-file-system DownloadTask). */
export type DownloadJob = {
  trackId: string;
  state: DownloadState;
  ratio: number; // 0..1
  bytesWritten: number;
  totalBytes: number;
  error?: string;
};

export type ThemePreference = 'system' | 'light' | 'dark' | 'oled';

/** maps to: best_lossy -> mp32 | lossless -> flac | data_saver -> mp31 */
export type DownloadQuality = 'best_lossy' | 'lossless' | 'data_saver';

/** App settings (AsyncStorage via Zustand persist). */
export type Settings = {
  theme: ThemePreference;
  downloadQuality: DownloadQuality;
  wifiOnlyDownloads: boolean;
  autoSyncEnabled: boolean;
  /** Only allow Audius tracks that are is_downloadable && CC-licensed. Default on. */
  audiusStrictMode: boolean;
  /** Read-only Jamendo client_id (embeddable). Empty until the user supplies one. */
  jamendoClientId: string;
  /** Courtesy identifier sent to Audius; not a secret. */
  audiusAppName: string;
};

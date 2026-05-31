import type {
  AudioQuality,
  ResolvedTrack,
  SourceKind,
} from '@/types/models';

/** A resolved playlist/album/collection plus its license-gated track list. */
export type ResolvedCollection = {
  sourceKind: SourceKind;
  sourceCollectionId: string;
  sourceUrl: string;
  title: string;
  artworkUrl: string | null;
  tracks: ResolvedTrack[];
};

/** A single browse/search hit (track or collection). */
export type SearchResult = {
  kind: 'track' | 'collection';
  sourceKind: SourceKind;
  /** sourceTrackId (track) or sourceCollectionId (collection). */
  id: string;
  title: string;
  /** artist / creator / owner. */
  subtitle: string | null;
  artworkUrl: string | null;
  isDownloadable: boolean;
};

/** A page of results with cursor-style pagination. */
export type Page<T> = {
  items: T[];
  nextOffset: number | null;
  total: number | null;
};

/**
 * Every source adapter implements this contract. Adapters are the ONLY place that
 * talks to a remote catalog, and the ONLY place that decides legality
 * (`isDownloadable`). The rest of the app is source-agnostic.
 */
export interface SourceAdapter {
  readonly kind: SourceKind;

  /** Does this adapter own the pasted URL? */
  matches(url: string): boolean;

  /** Resolve a pasted public URL into a collection + its already-gated track list. */
  resolveUrl(url: string): Promise<ResolvedCollection>;

  /** In-app browse/search for this source (used by the Search screen). */
  search(query: string, offset?: number): Promise<Page<SearchResult>>;

  /** Fetch (a page of) full tracks for a known collection id. */
  getCollectionTracks(
    sourceCollectionId: string,
    offset?: number,
  ): Promise<Page<ResolvedTrack>>;

  /**
   * Directly downloadable file URL at the requested quality, honoring the legal
   * gate. Returns null when download is not permitted for this track.
   */
  getDownloadUrl(track: ResolvedTrack, quality: AudioQuality): Promise<string | null>;

  /** Streaming URL (for preview / stream-only items). */
  getStreamUrl(track: ResolvedTrack): Promise<string>;

  /** Optional: resolve a single track by source id (to import single-track search results). */
  getTrack?(sourceTrackId: string): Promise<ResolvedTrack | null>;
}

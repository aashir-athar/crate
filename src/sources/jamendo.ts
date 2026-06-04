import { SOURCE_BASE_URLS } from '@/constants/sources';
import type { AudioQuality, ResolvedTrack } from '@/types/models';

import { enc, getJson } from './http';
import { parseLicense } from './license';
import { getJamendoClientId } from './runtimeConfig';
import type { Page, ResolvedCollection, SearchResult, SourceAdapter } from './types';

const BASE = SOURCE_BASE_URLS.jamendo;
const SEARCH_LIMIT = 40;

type JamendoTrack = {
  id: number | string;
  name?: string;
  duration?: number;
  artist_name?: string;
  album_name?: string;
  album_image?: string;
  image?: string;
  license_ccurl?: string;
  audio?: string;
  audiodownload?: string;
  audiodownload_allowed?: boolean | string;
};

type JamendoPlaylist = {
  id: number | string;
  name?: string;
  tracks?: JamendoTrack[];
};

type JamendoResponse<T> = {
  headers?: { results_count?: number; results_fullcount?: number; error_message?: string };
  results?: T[];
};

function requireClientId(): string {
  const id = getJamendoClientId();
  if (!id) {
    throw new Error(
      'Add your free Jamendo client ID in Settings to browse or import from Jamendo.',
    );
  }
  return id;
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(/playlists?\/(\d+)/i);
  return match ? match[1] : null;
}

function downloadAllowed(track: JamendoTrack): boolean {
  return track.audiodownload_allowed === true || track.audiodownload_allowed === 'true';
}

function mapTrack(track: JamendoTrack): ResolvedTrack {
  const allowed = downloadAllowed(track);
  return {
    sourceKind: 'jamendo',
    sourceTrackId: String(track.id),
    title: track.name ?? 'Untitled',
    artist: track.artist_name ?? null,
    album: track.album_name ?? null,
    durationSec: typeof track.duration === 'number' ? track.duration : null,
    artworkUrl: track.image ?? track.album_image ?? null,
    downloadUrl: allowed ? track.audiodownload ?? null : null,
    streamUrl: track.audio ?? null,
    availableQualities: ['mp31', 'mp32', 'ogg', 'flac'],
    bestQuality: 'mp32',
    license: parseLicense(track.license_ccurl ?? null),
    isDownloadable: allowed,
  };
}

function qualityToFormat(quality: AudioQuality): string {
  switch (quality) {
    case 'flac':
      return 'flac';
    case 'mp31':
      return 'mp31';
    case 'ogg':
      return 'ogg';
    default:
      return 'mp32';
  }
}

export const jamendoAdapter: SourceAdapter = {
  kind: 'jamendo',

  matches(url: string): boolean {
    return /(^|\/\/|\.)jamendo\.com\//i.test(url);
  },

  async resolveUrl(url: string): Promise<ResolvedCollection> {
    const clientId = requireClientId();
    const id = extractPlaylistId(url);
    if (!id) {
      throw new Error('Could not find a Jamendo playlist id in that link.');
    }
    const endpoint =
      `${BASE}/playlists/tracks/?client_id=${clientId}&id=${id}&format=json` +
      `&audioformat=mp32&include=licenses+musicinfo&limit=200`;
    const data = await getJson<JamendoResponse<JamendoPlaylist>>(endpoint);
    const playlist = data.results?.[0];
    if (!playlist) {
      throw new Error('That Jamendo playlist is empty or unavailable.');
    }
    const tracks = (playlist.tracks ?? []).map(mapTrack);
    return {
      sourceKind: 'jamendo',
      sourceCollectionId: String(playlist.id),
      sourceUrl: url,
      title: playlist.name ?? 'Jamendo Playlist',
      artworkUrl: tracks.find((t) => t.artworkUrl)?.artworkUrl ?? null,
      tracks,
    };
  },

  // Search resolves Jamendo PLAYLISTS (each becomes an importable crate); the
  // per-track download gate is applied when the crate's tracks are fetched.
  async search(query: string, offset = 0): Promise<Page<SearchResult>> {
    const clientId = requireClientId();
    const endpoint =
      `${BASE}/playlists/?client_id=${clientId}&format=json&namesearch=${enc(query)}` +
      `&limit=${SEARCH_LIMIT}&offset=${offset}`;
    const data = await getJson<JamendoResponse<JamendoPlaylist & { user_name?: string }>>(endpoint);
    const results = data.results ?? [];
    const items: SearchResult[] = results.map((playlist) => ({
      kind: 'collection',
      sourceKind: 'jamendo',
      id: String(playlist.id),
      title: playlist.name ?? 'Untitled playlist',
      subtitle: playlist.user_name ?? null,
      artworkUrl: null,
      isDownloadable: true,
    }));
    const total = data.headers?.results_fullcount ?? null;
    return {
      items,
      nextOffset: results.length === SEARCH_LIMIT ? offset + SEARCH_LIMIT : null,
      total: typeof total === 'number' ? total : null,
    };
  },

  async getCollectionTracks(sourceCollectionId: string): Promise<Page<ResolvedTrack>> {
    const clientId = requireClientId();
    const endpoint =
      `${BASE}/playlists/tracks/?client_id=${clientId}&id=${sourceCollectionId}&format=json` +
      `&audioformat=mp32&include=licenses+musicinfo&limit=200`;
    const data = await getJson<JamendoResponse<JamendoPlaylist>>(endpoint);
    const tracks = (data.results?.[0]?.tracks ?? []).map(mapTrack);
    return { items: tracks, nextOffset: null, total: tracks.length };
  },

  async getDownloadUrl(track: ResolvedTrack, quality: AudioQuality): Promise<string | null> {
    if (!track.isDownloadable) return null;
    const format = qualityToFormat(quality);
    if (format === 'mp32' && track.downloadUrl) return track.downloadUrl;
    const clientId = requireClientId();
    return `${BASE}/tracks/file/?client_id=${clientId}&id=${track.sourceTrackId}&audiodlformat=${format}`;
  },

  async getStreamUrl(track: ResolvedTrack): Promise<string> {
    if (track.streamUrl) return track.streamUrl;
    if (track.downloadUrl) return track.downloadUrl;
    throw new Error('No playable URL for this track.');
  },
};

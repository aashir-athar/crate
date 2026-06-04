import { SOURCE_BASE_URLS } from '@/constants/sources';
import type { ResolvedTrack } from '@/types/models';

import { enc, getJson } from './http';
import { parseLicense } from './license';
import { getAudiusAppName, getAudiusStrictMode } from './runtimeConfig';
import type { Page, ResolvedCollection, SearchResult, SourceAdapter } from './types';

const BASE = SOURCE_BASE_URLS.audius;

type AudiusArtwork = Record<string, string> | null;

type AudiusUser = { name?: string; handle?: string };

type AudiusTrack = {
  id: string;
  title?: string;
  duration?: number;
  artwork?: AudiusArtwork;
  user?: AudiusUser;
  is_downloadable?: boolean;
  license?: string | null;
};

type AudiusPlaylist = {
  id: string;
  playlist_name?: string;
  playlist_contents?: unknown;
  is_album?: boolean;
  artwork?: AudiusArtwork;
  user?: AudiusUser;
};

type AudiusEntity = AudiusTrack | AudiusPlaylist;

function appNameParam(): string {
  return `app_name=${enc(getAudiusAppName())}`;
}

function pickArtwork(artwork: AudiusArtwork | undefined): string | null {
  if (!artwork) return null;
  return artwork['480x480'] ?? artwork['1000x1000'] ?? artwork['150x150'] ?? null;
}

function isPermissiveLicense(license: string | null | undefined): boolean {
  if (!license) return false;
  return /attribution|creativecommons|cc[\s-]?by|cc0|public\s?domain/i.test(license);
}

function isPlaylist(entity: AudiusEntity): entity is AudiusPlaylist {
  return 'playlist_name' in entity || 'playlist_contents' in entity;
}

function mapTrack(track: AudiusTrack): ResolvedTrack {
  const strict = getAudiusStrictMode();
  const downloadable = track.is_downloadable === true;
  const permissive = isPermissiveLicense(track.license);
  const isDownloadable = downloadable && (!strict || permissive);
  const params = appNameParam();
  return {
    sourceKind: 'audius',
    sourceTrackId: track.id,
    title: track.title ?? 'Untitled',
    artist: track.user?.name ?? track.user?.handle ?? null,
    album: null,
    durationSec: typeof track.duration === 'number' ? track.duration : null,
    artworkUrl: pickArtwork(track.artwork),
    downloadUrl: isDownloadable ? `${BASE}/v1/tracks/${enc(track.id)}/download?${params}` : null,
    streamUrl: `${BASE}/v1/tracks/${enc(track.id)}/stream?${params}`,
    availableQualities: ['mp32'],
    bestQuality: 'mp32',
    license: parseLicense(track.license ?? null, track.license ?? null),
    isDownloadable,
  };
}

export const audiusAdapter: SourceAdapter = {
  kind: 'audius',

  matches(url: string): boolean {
    return /(^|\/\/|\.)audius\.co\//i.test(url) && !/api\.audius\.co/i.test(url);
  },

  async resolveUrl(url: string): Promise<ResolvedCollection> {
    const resolved = await getJson<{ data?: AudiusEntity }>(
      `${BASE}/v1/resolve?${appNameParam()}&url=${enc(url)}`,
    );
    const entity = resolved.data;
    if (!entity) {
      throw new Error('Could not resolve that Audius link.');
    }

    if (isPlaylist(entity)) {
      const tracksResp = await getJson<{ data?: AudiusTrack[] }>(
        `${BASE}/v1/playlists/${enc(entity.id)}/tracks?${appNameParam()}`,
      );
      const tracks = (tracksResp.data ?? []).map(mapTrack);
      return {
        sourceKind: 'audius',
        sourceCollectionId: entity.id,
        sourceUrl: url,
        title: entity.playlist_name ?? 'Audius Playlist',
        artworkUrl: pickArtwork(entity.artwork),
        tracks,
      };
    }

    // Single track -> a one-track collection.
    const track = mapTrack(entity);
    return {
      sourceKind: 'audius',
      sourceCollectionId: entity.id,
      sourceUrl: url,
      title: track.title,
      artworkUrl: track.artworkUrl,
      tracks: [track],
    };
  },

  async search(query: string): Promise<Page<SearchResult>> {
    const data = await getJson<{ data?: AudiusTrack[] }>(
      `${BASE}/v1/tracks/search?query=${enc(query)}&${appNameParam()}`,
    );
    const strict = getAudiusStrictMode();
    const items: SearchResult[] = (data.data ?? []).map((track) => {
      const downloadable = track.is_downloadable === true;
      const permissive = isPermissiveLicense(track.license);
      return {
        kind: 'track',
        sourceKind: 'audius',
        id: track.id,
        title: track.title ?? 'Untitled',
        subtitle: track.user?.name ?? track.user?.handle ?? null,
        artworkUrl: pickArtwork(track.artwork),
        isDownloadable: downloadable && (!strict || permissive),
      };
    });
    return { items, nextOffset: null, total: items.length };
  },

  async getCollectionTracks(sourceCollectionId: string): Promise<Page<ResolvedTrack>> {
    const data = await getJson<{ data?: AudiusTrack[] }>(
      `${BASE}/v1/playlists/${enc(sourceCollectionId)}/tracks?${appNameParam()}`,
    );
    const tracks = (data.data ?? []).map(mapTrack);
    return { items: tracks, nextOffset: null, total: tracks.length };
  },

  async getDownloadUrl(track: ResolvedTrack): Promise<string | null> {
    return track.isDownloadable ? track.downloadUrl : null;
  },

  async getStreamUrl(track: ResolvedTrack): Promise<string> {
    if (track.streamUrl) return track.streamUrl;
    throw new Error('No playable URL for this track.');
  },

  async getTrack(sourceTrackId: string): Promise<ResolvedTrack | null> {
    const data = await getJson<{ data?: AudiusTrack }>(
      `${BASE}/v1/tracks/${enc(sourceTrackId)}?${appNameParam()}`,
    );
    return data.data ? mapTrack(data.data) : null;
  },
};

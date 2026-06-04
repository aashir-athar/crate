import { SOURCE_BASE_URLS } from '@/constants/sources';
import type { AudioQuality, ResolvedTrack } from '@/types/models';

import { enc, getJson } from './http';
import { parseLicense } from './license';
import type { Page, ResolvedCollection, SearchResult, SourceAdapter } from './types';

const BASE = SOURCE_BASE_URLS.internet_archive;
const SEARCH_ROWS = 40;

type IaFile = {
  name: string;
  source?: string;
  format?: string;
  length?: string | number;
  size?: string | number;
  title?: string;
  track?: string | number;
};

type IaMetadataField = {
  title?: string;
  creator?: string | string[];
  licenseurl?: string;
  collection?: string | string[];
  mediatype?: string;
};

type IaMetadataResponse = {
  metadata?: IaMetadataField;
  files?: IaFile[];
};

type IaSearchDoc = {
  identifier?: string;
  title?: string;
  creator?: string | string[];
  licenseurl?: string;
};

type IaSearchResponse = {
  response?: { numFound?: number; start?: number; docs?: IaSearchDoc[] };
};

function extractIdentifier(url: string): string | null {
  const match = url.match(/archive\.org\/(?:details|download|metadata)\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function firstString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null;
  return typeof value === 'string' ? value : null;
}

function collectionList(meta: IaMetadataField | undefined): string[] {
  const c = meta?.collection;
  if (Array.isArray(c)) return c;
  if (typeof c === 'string') return [c];
  return [];
}

function isPlayableAudio(format: string | undefined): boolean {
  if (!format) return false;
  return /mp3|ogg|flac/i.test(format);
}

function parseLength(length: string | number | undefined): number | null {
  if (typeof length === 'number') return Number.isFinite(length) ? length : null;
  if (typeof length !== 'string') return null;
  if (length.includes(':')) {
    const parts = length.split(':').map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = Number(length);
  return Number.isFinite(n) ? n : null;
}

function cleanName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
}

function fileUrl(identifier: string, fileName: string): string {
  return `${BASE}/download/${enc(identifier)}/${enc(fileName)}`;
}

// A genuinely permissive license: Creative Commons or public domain. Anything
// else (incl. an unrecognized "Custom license" URL) is treated as stream-only.
function isPermissiveLicenseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return parseLicense(url).name === 'Public Domain' || url.includes('creativecommons.org');
}

async function itemToCollection(identifier: string, sourceUrl: string): Promise<ResolvedCollection> {
  const data = await getJson<IaMetadataResponse>(`${BASE}/metadata/${enc(identifier)}`, {
    userAgent: true,
  });
  const meta = data.metadata;
  if (meta?.mediatype === 'collection') {
    throw new Error(
      'That link is an Internet Archive collection. Open a specific album or recording and paste its link.',
    );
  }

  const licenseUrl = meta?.licenseurl ?? null;
  const streamOnly = collectionList(meta).includes('stream_only');
  const itemLicense = parseLicense(licenseUrl);
  const permissive = isPermissiveLicenseUrl(licenseUrl);
  const artist = firstString(meta?.creator);
  const albumTitle = meta?.title ?? identifier;
  const artworkUrl = `${BASE}/services/img/${enc(identifier)}`;

  const audioFiles = (data.files ?? []).filter((f) => isPlayableAudio(f.format));
  const mp3Files = audioFiles.filter((f) => /mp3/i.test(f.format ?? ''));
  const chosen = mp3Files.length > 0 ? mp3Files : audioFiles;
  const isDownloadable = permissive && !streamOnly;

  const tracks: ResolvedTrack[] = chosen.map((file) => {
    const url = fileUrl(identifier, file.name);
    const fmt = (file.format ?? '').toLowerCase();
    const quality: AudioQuality = /flac/.test(fmt)
      ? 'flac'
      : /ogg|vorbis/.test(fmt)
        ? 'ogg'
        : 'mp32';
    return {
      sourceKind: 'internet_archive',
      sourceTrackId: file.name,
      title: file.title ?? cleanName(file.name),
      artist,
      album: albumTitle,
      durationSec: parseLength(file.length),
      artworkUrl,
      downloadUrl: isDownloadable ? url : null,
      streamUrl: url,
      availableQualities: [quality],
      bestQuality: quality,
      license: itemLicense,
      isDownloadable,
    };
  });

  return {
    sourceKind: 'internet_archive',
    sourceCollectionId: identifier,
    sourceUrl,
    title: albumTitle,
    artworkUrl,
    tracks,
  };
}

export const internetArchiveAdapter: SourceAdapter = {
  kind: 'internet_archive',

  matches(url: string): boolean {
    return /archive\.org\/(details|download|metadata)\//i.test(url);
  },

  async resolveUrl(url: string): Promise<ResolvedCollection> {
    const identifier = extractIdentifier(url);
    if (!identifier) {
      throw new Error('Could not find an Internet Archive item id in that link.');
    }
    return itemToCollection(identifier, url);
  },

  async search(query: string, offset = 0): Promise<Page<SearchResult>> {
    const page = Math.floor(offset / SEARCH_ROWS) + 1;
    const q = enc(`(${query}) AND mediatype:audio`);
    const fields = ['identifier', 'title', 'creator', 'licenseurl']
      .map((f) => `fl[]=${f}`)
      .join('&');
    const endpoint =
      `${BASE}/advancedsearch.php?q=${q}&${fields}` +
      `&rows=${SEARCH_ROWS}&page=${page}&output=json`;
    const data = await getJson<IaSearchResponse>(endpoint, { userAgent: true });
    const docs = data.response?.docs ?? [];
    const items: SearchResult[] = docs
      .filter((doc): doc is IaSearchDoc & { identifier: string } => Boolean(doc.identifier))
      .map((doc) => ({
        kind: 'collection',
        sourceKind: 'internet_archive',
        id: doc.identifier,
        title: doc.title ?? doc.identifier,
        subtitle: firstString(doc.creator),
        artworkUrl: `${BASE}/services/img/${enc(doc.identifier)}`,
        isDownloadable: isPermissiveLicenseUrl(doc.licenseurl),
      }));
    const total = data.response?.numFound ?? null;
    return {
      items,
      nextOffset: docs.length === SEARCH_ROWS ? offset + SEARCH_ROWS : null,
      total: typeof total === 'number' ? total : null,
    };
  },

  async getCollectionTracks(sourceCollectionId: string): Promise<Page<ResolvedTrack>> {
    const collection = await itemToCollection(
      sourceCollectionId,
      `${BASE}/details/${sourceCollectionId}`,
    );
    return { items: collection.tracks, nextOffset: null, total: collection.tracks.length };
  },

  async getDownloadUrl(track: ResolvedTrack): Promise<string | null> {
    return track.isDownloadable ? track.downloadUrl : null;
  },

  async getStreamUrl(track: ResolvedTrack): Promise<string> {
    if (track.streamUrl) return track.streamUrl;
    throw new Error('No playable URL for this track.');
  },
};

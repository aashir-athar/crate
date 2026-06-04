import type { AudioQuality, DownloadQuality, ResolvedTrack, Track } from '@/types/models';

/** Rebuild an adapter-shaped ResolvedTrack from a persisted Track row. */
export function trackToResolved(track: Track): ResolvedTrack {
  return {
    sourceKind: track.sourceKind,
    sourceTrackId: track.sourceTrackId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationSec: track.durationSec,
    artworkUrl: track.artworkUrl,
    downloadUrl: track.downloadUrl,
    streamUrl: track.streamUrl,
    availableQualities: [track.bestQuality],
    bestQuality: track.bestQuality,
    license: {
      url: track.licenseUrl,
      name: track.licenseName,
      requiresAttribution: track.requiresAttribution === 1,
      nonCommercial: track.nonCommercial === 1,
      noDerivatives: track.noDerivatives === 1,
      shareAlike: track.shareAlike === 1,
    },
    isDownloadable: track.isDownloadable === 1,
  };
}

export function downloadQualityToAudio(quality: DownloadQuality): AudioQuality {
  switch (quality) {
    case 'lossless':
      return 'flac';
    case 'data_saver':
      return 'mp31';
    default:
      return 'mp32';
  }
}

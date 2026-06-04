import type { LicenseInfo } from '@/types/models';

const EMPTY: LicenseInfo = {
  url: null,
  name: null,
  requiresAttribution: false,
  nonCommercial: false,
  noDerivatives: false,
  shareAlike: false,
};

function deriveCcName(lowerUrl: string): string {
  // Modern CC URLs look like /licenses/by-nc-sa/4.0/
  const match = lowerUrl.match(/licenses\/(by(?:-nc)?(?:-nd)?(?:-sa)?)\/(\d+\.\d+)/);
  if (match) {
    return `CC ${match[1].toUpperCase()} ${match[2]}`;
  }
  if (lowerUrl.includes('licenses/by')) return 'CC BY';
  if (lowerUrl.includes('artlibre') || lowerUrl.includes('free-art')) return 'Free Art License';
  return 'Creative Commons';
}

/**
 * Parse a license URL (Jamendo license_ccurl / IA licenseurl / Audius license)
 * into structured terms the UI can surface and the downloader can respect.
 */
export function parseLicense(
  url: string | null | undefined,
  name?: string | null,
): LicenseInfo {
  if (!url) {
    return name ? { ...EMPTY, name } : EMPTY;
  }
  const lower = url.toLowerCase();

  const isPublicDomain =
    lower.includes('publicdomain') ||
    lower.includes('/cc0') ||
    lower.includes('/zero/');
  if (isPublicDomain) {
    return {
      url,
      name: name ?? 'Public Domain',
      requiresAttribution: false,
      nonCommercial: false,
      noDerivatives: false,
      shareAlike: false,
    };
  }

  const isCc = lower.includes('creativecommons.org') || lower.includes('/licenses/');
  return {
    url,
    name: name ?? (isCc ? deriveCcName(lower) : 'Custom license'),
    // All modern CC licenses except CC0 require attribution.
    requiresAttribution: isCc && lower.includes('/by'),
    nonCommercial: lower.includes('-nc'),
    noDerivatives: lower.includes('-nd'),
    shareAlike: lower.includes('-sa'),
  };
}

/** A concise attribution string for UI ("Artist — CC BY-SA 4.0"). */
export function attributionLine(
  artist: string | null,
  license: LicenseInfo,
): string {
  const parts: string[] = [];
  if (artist) parts.push(artist);
  if (license.name) parts.push(license.name);
  return parts.join(' — ') || 'Unknown';
}

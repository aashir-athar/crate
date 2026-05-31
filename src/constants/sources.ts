import type { SourceKind } from '@/types/models';

/**
 * Source configuration.
 *
 * - Jamendo requires a free, read-only `client_id` (register at
 *   https://devportal.jamendo.com). It is embeddable; the Settings screen lets a
 *   user paste their own. Ships empty so the build never contains someone else's key.
 * - Internet Archive needs no key or auth for public read/search/download.
 * - Audius needs only a free-form `app_name` courtesy identifier (not a secret).
 */
export const DEFAULT_JAMENDO_CLIENT_ID = '';
export const DEFAULT_AUDIUS_APP_NAME = 'crate-offline-player';

export const SOURCE_BASE_URLS = {
  jamendo: 'https://api.jamendo.com/v3.0',
  internet_archive: 'https://archive.org',
  audius: 'https://api.audius.co',
} as const satisfies Record<SourceKind, string>;

export const SOURCE_LABELS = {
  jamendo: 'Jamendo',
  internet_archive: 'Internet Archive',
  audius: 'Audius',
} as const satisfies Record<SourceKind, string>;

/** Short blurb shown in the source picker / about screen. */
export const SOURCE_DESCRIPTIONS = {
  jamendo: 'Curated Creative Commons catalog with explicit per-track download permission.',
  internet_archive: 'Millions of public-domain and CC audio items. No account required.',
  audius: 'Open artist platform. Restricted to downloadable, permissively licensed tracks.',
} as const satisfies Record<SourceKind, string>;

/** Per-source accent tint (hex), used sparingly on badges. */
export const SOURCE_ACCENTS = {
  jamendo: '#E8732C',
  internet_archive: '#4C8DF6',
  audius: '#7E5BEF',
} as const satisfies Record<SourceKind, string>;

/** Network politeness: a descriptive UA for Internet Archive requests. */
export const CRATE_USER_AGENT = 'Crate/1.0 (offline music player; +https://github.com/aashir-athar/crate)';

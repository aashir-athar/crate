import * as Crypto from 'expo-crypto';

/** Stable app-level identifier for a persisted row. */
export function newId(): string {
  return Crypto.randomUUID();
}

/**
 * Deterministic identity for a source track, so re-resolving a collection maps to
 * the same row instead of duplicating it. Keep in sync with the sync-diff logic.
 */
export function sourceTrackKey(sourceKind: string, sourceTrackId: string): string {
  return `${sourceKind}:${sourceTrackId}`;
}

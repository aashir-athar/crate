import type { SourceKind } from '@/types/models';

import { audiusAdapter } from './audius';
import { internetArchiveAdapter } from './internetArchive';
import { jamendoAdapter } from './jamendo';
import type { SourceAdapter } from './types';

/** All registered source adapters, in detection priority order. */
export const adapters: readonly SourceAdapter[] = [
  jamendoAdapter,
  internetArchiveAdapter,
  audiusAdapter,
];

/** The first adapter that recognizes a pasted URL, or null if none do. */
export function detectSourceFromUrl(url: string): SourceAdapter | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return adapters.find((adapter) => adapter.matches(trimmed)) ?? null;
}

/** Look up an adapter by its source kind. */
export function getAdapter(kind: SourceKind): SourceAdapter {
  const adapter = adapters.find((a) => a.kind === kind);
  if (!adapter) {
    throw new Error(`No source adapter registered for "${kind}".`);
  }
  return adapter;
}

import { create } from 'zustand';

import type { SyncDiff } from '@/types/models';

type SyncStore = {
  /** Collections with an in-flight sync. */
  active: Record<string, boolean>;
  /** Last sync diff per collection id. */
  lastDiff: Record<string, SyncDiff>;
  setActive: (collectionId: string, value: boolean) => void;
  setDiff: (collectionId: string, diff: SyncDiff) => void;
};

export const useSync = create<SyncStore>((set) => ({
  active: {},
  lastDiff: {},
  setActive: (collectionId, value) =>
    set((s) => ({ active: { ...s.active, [collectionId]: value } })),
  setDiff: (collectionId, diff) =>
    set((s) => ({ lastDiff: { ...s.lastDiff, [collectionId]: diff } })),
}));

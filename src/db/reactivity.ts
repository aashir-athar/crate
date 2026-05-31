import { create } from 'zustand';

/**
 * Lightweight reactivity bridge for SQLite. Screens read the library through
 * synchronous repository queries memoized on `version`; any mutation calls
 * `bumpLibrary()` so dependent lists recompute. Avoids FTS/native change
 * listeners while keeping the UI live.
 */
type LibraryStore = {
  version: number;
  bump: () => void;
};

export const useLibraryStore = create<LibraryStore>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export function bumpLibrary(): void {
  useLibraryStore.getState().bump();
}

export function useLibraryVersion(): number {
  return useLibraryStore((s) => s.version);
}

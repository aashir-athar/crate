import { create } from 'zustand';

import type { DownloadJob } from '@/types/models';

type DownloadStore = {
  /** Live jobs keyed by track id. */
  jobs: Record<string, DownloadJob>;
  setJob: (job: DownloadJob) => void;
  patch: (trackId: string, partial: Partial<DownloadJob>) => void;
  remove: (trackId: string) => void;
  clearFinished: () => void;
};

export const useDownloads = create<DownloadStore>((set) => ({
  jobs: {},
  setJob: (job) => set((s) => ({ jobs: { ...s.jobs, [job.trackId]: job } })),
  patch: (trackId, partial) =>
    set((s) => {
      const current = s.jobs[trackId];
      if (!current) return s;
      return { jobs: { ...s.jobs, [trackId]: { ...current, ...partial } } };
    }),
  remove: (trackId) =>
    set((s) => {
      if (!s.jobs[trackId]) return s;
      const next = { ...s.jobs };
      delete next[trackId];
      return { jobs: next };
    }),
  clearFinished: () =>
    set((s) => {
      const next: Record<string, DownloadJob> = {};
      for (const [key, job] of Object.entries(s.jobs)) {
        if (job.state !== 'downloaded') next[key] = job;
      }
      return { jobs: next };
    }),
}));
